"""Deterministic trusted-main static artifact delivery over pinned restricted SSH."""
import hashlib
import io
import json
import os
import subprocess
import tempfile
import time
import zipfile
from pathlib import Path
from release import MAX_UPLOAD, validate_archive, validate_metadata

COMMAND = 'tg-publish-v1'
HOST = '2.24.125.17'
USER = 'tgdeploy'
# Read authoritatively from this target's public host-key file, not ssh-keyscan.
KNOWN_HOST = '2.24.125.17 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINeTbxJxSiASXcXnI7I/9w2w9+1JQm+dl9yyHWJK7zVD'


def package(root):
    output = io.BytesIO()
    root = Path(root)
    if root.is_symlink():
        raise ValueError('dist symlink')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(root.rglob('*')):
            if path.is_symlink():
                raise ValueError('dist symlink')
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(root).as_posix())
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100444 << 16
                archive.writestr(info, path.read_bytes())
    body = output.getvalue()
    if len(body) > MAX_UPLOAD:
        raise ValueError('upload too large')
    validate_archive(body)
    return body


def metadata():
    value = {'repository': os.environ['GITHUB_REPOSITORY'], 'ref': os.environ['GITHUB_REF'],
             'sha': os.environ['GITHUB_SHA'], 'event': os.environ['GITHUB_EVENT_NAME'],
             'timestamp': int(time.time()), 'run_number': int(os.environ['GITHUB_RUN_NUMBER']),
             'run_attempt': int(os.environ['GITHUB_RUN_ATTEMPT']), 'deployment_id': os.environ['GITHUB_RUN_ID']}
    return validate_metadata(value)


def frame(body, value):
    validate_metadata(value)
    if not 0 < len(body) <= MAX_UPLOAD:
        raise ValueError('upload bounds')
    header = json.dumps({'metadata': value, 'size': len(body), 'sha256': hashlib.sha256(body).hexdigest()},
                        sort_keys=True, separators=(',', ':')).encode()
    return header + b'\n' + body


def deliver(body, value, key, known=KNOWN_HOST):
    payload = frame(body, value)
    if not key or known != KNOWN_HOST:
        raise ValueError('deployment identity missing or changed')
    with tempfile.TemporaryDirectory(prefix='tg-ssh-') as directory:
        paths = [Path(directory)/'identity', Path(directory)/'known_hosts']
        for path, content in zip(paths, [key, known + '\n']):
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as stream:
                stream.write(content)
        args = ['ssh', '-F', '/dev/null', '-T', '-i', str(paths[0]),
                '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
                '-o', 'UserKnownHostsFile='+str(paths[1]), '-o', 'GlobalKnownHostsFile=/dev/null',
                '-o', 'HostKeyAlgorithms=ssh-ed25519', '-o', 'ConnectTimeout=15',
                '-o', 'ServerAliveInterval=5', '-o', 'ServerAliveCountMax=3',
                '-o', 'ClearAllForwardings=yes', '-o', 'ForwardAgent=no',
                USER+'@'+HOST, COMMAND]
        env = {k:v for k,v in os.environ.items() if k not in {'TG_DEPLOY_SSH_PRIVATE_KEY','SSH_AUTH_SOCK'}}
        # Files bound child output on disk; never emit stderr or untrusted response.
        with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
            try:
                response = subprocess.run(args, input=payload, stdout=out, stderr=err, env=env, timeout=120)
            except (OSError, subprocess.TimeoutExpired):
                raise RuntimeError('deployment transport unavailable') from None
            if response.returncode != 0:
                raise RuntimeError('deployment not acknowledged')
            out.seek(0)
            raw = out.read(4097)
            try:
                result = json.loads(raw) if len(raw) <= 4096 else None
            except (ValueError, UnicodeError):
                result = None
            if (not isinstance(result, dict) or set(result) != {'status','sha'}
                    or result['status'] not in {'published','idempotent'} or result['sha'] != value['sha']):
                raise RuntimeError('unexpected deployment response')
            return {'status': result['status'], 'sha': result['sha']}


def main():
    key = os.environ.pop('TG_DEPLOY_SSH_PRIVATE_KEY')
    print(json.dumps(deliver(package('dist'), metadata(), key), sort_keys=True))


if __name__ == '__main__':
    main()
