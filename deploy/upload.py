"""Package tested dist and deliver a signed release; redirects are never followed."""
import io
import json
import os
import time
import subprocess
import tempfile
import zipfile
from pathlib import Path

from release import MAX_UPLOAD, REPOSITORY, authenticate, signed_headers, validate_archive

ENDPOINT = 'https://tg-beta.absoluteparallax.com/_deploy'
UPLOAD_TIMEOUT = 120
MAX_ATTEMPTS = 3


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
    # Reuse receiver's validation before any network call.
    key = b'validation-only-not-a-deployment-key'
    authenticate(key, signed_headers(key, value, b''), b'')
    return value


def deliver(body, value, key, access_id, access_secret):
    for credential in (access_id, access_secret):
        if not credential or len(credential) > 512 or any(not 33 <= ord(c) <= 126 for c in credential):
            raise ValueError('invalid deployment Access credential')
    signed = signed_headers(key, value, body)
    headers = {'Content-Type': 'application/zip', 'Content-Length': str(len(body)),
               'X-TG-Metadata': signed['metadata'], 'X-TG-Signature': signed['signature'],
               'CF-Access-Client-Id': access_id, 'CF-Access-Client-Secret': access_secret}
    # curl's normal client, not an impersonated browser. Credentials live in a
    # private header file, never argv, stderr, response logging or redirects.
    with tempfile.TemporaryDirectory(prefix='tg-upload-') as directory:
        header_path = Path(directory) / 'headers'
        response_path = Path(directory) / 'response'
        for path in (header_path, response_path):
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            os.close(fd)
        header_path.write_text(''.join(f'{k}: {v}\n' for k, v in headers.items()))
        args = ['curl', '--disable', '--silent', '--proto', '=https',
                '--proto-redir', '=https', '--max-redirs', '0',
                '--connect-timeout', '15', '--max-time', str(UPLOAD_TIMEOUT),
                '--max-filesize', '4096', '--request', 'POST',
                '--header', '@' + str(header_path), '--data-binary', '@-',
                '--output', str(response_path), '--write-out', '%{http_code}', ENDPOINT]
        # Do not inherit deployment credentials into the child process.
        env = {k: v for k, v in os.environ.items() if k not in {
            'TG_DEPLOY_HMAC_KEY', 'TG_DEPLOY_CF_ACCESS_CLIENT_ID', 'TG_DEPLOY_CF_ACCESS_CLIENT_SECRET'}}
        for attempt in range(MAX_ATTEMPTS):
            try:
                response = subprocess.run(args, input=body, stdout=subprocess.PIPE,
                                          stderr=subprocess.PIPE, env=env, timeout=UPLOAD_TIMEOUT + 5)
            except (OSError, subprocess.TimeoutExpired):
                raise RuntimeError('deploy transport unavailable') from None
            status = response.stdout.decode('ascii', errors='replace')
            if response.returncode == 0 and status == '200':
                try:
                    result = json.loads(response_path.read_bytes()[:4096])
                except (ValueError, OSError):
                    raise RuntimeError('unexpected deployment response') from None
                if not isinstance(result, dict) or result.get('status') not in {'published', 'idempotent'} or result.get('sha') != value['sha']:
                    raise RuntimeError('unexpected deployment response')
                # Return only allowlisted fields, never untrusted response text.
                return {'status': result['status'], 'sha': result['sha']}
            transient = response.returncode in {5, 6, 7, 28, 52, 55, 56} or (response.returncode == 0 and status in {'429', '502', '503', '504'})
            if not transient or attempt == MAX_ATTEMPTS - 1:
                raise RuntimeError('deployment not acknowledged; transport or HTTP rejected')
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('deployment not acknowledged')


def main():
    key = os.environ.pop('TG_DEPLOY_HMAC_KEY').encode()
    if len(key) < 32:
        raise ValueError('deployment key too short')
    access_id = os.environ.pop('TG_DEPLOY_CF_ACCESS_CLIENT_ID')
    access_secret = os.environ.pop('TG_DEPLOY_CF_ACCESS_CLIENT_SECRET')
    result = deliver(package('dist'), metadata(), key, access_id, access_secret)
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
