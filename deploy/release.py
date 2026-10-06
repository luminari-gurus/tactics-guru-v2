"""Bounded, authenticated static releases. No archive code is ever executed."""

import fcntl
import hashlib

import io
import json
import os
import re
import shutil
import stat
import tempfile
import time
import zipfile
from pathlib import Path

REPOSITORY = 'luminari-gurus/tactics-guru-v2'
MAX_UPLOAD = 20 * 1024 * 1024
MAX_EXPANDED = 64 * 1024 * 1024
MAX_MEMBER = 16 * 1024 * 1024
MAX_MEMBERS = 512
MAX_AGE = 900
EXTENSIONS = {'.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.mp3', '.ogg', '.wav'}



class Rejected(Exception):
    pass


def validate_metadata(metadata):
    """Transport authenticates the caller; this fixes publication context."""
    try:
        required = {'repository', 'ref', 'sha', 'event', 'timestamp', 'run_number', 'run_attempt', 'deployment_id'}
        if not isinstance(metadata, dict) or set(metadata) != required:
            raise ValueError()
        if metadata['repository'] != REPOSITORY or metadata['ref'] != 'refs/heads/main':
            raise ValueError()
        if metadata['event'] not in {'push', 'workflow_dispatch'}:
            raise ValueError()
        if not isinstance(metadata['sha'], str) or not re.fullmatch('[0-9a-f]{40}', metadata['sha']):
            raise ValueError()
        if not isinstance(metadata['deployment_id'], str) or not re.fullmatch('[0-9]{1,20}', metadata['deployment_id']):
            raise ValueError()
        for field in ('timestamp', 'run_number', 'run_attempt'):
            if type(metadata[field]) is not int or not 0 < metadata[field] < 10**15:
                raise ValueError()
        if not -60 <= time.time() - metadata['timestamp'] <= MAX_AGE:
            raise ValueError()
    except (ValueError, TypeError, KeyError, UnicodeError):
        raise Rejected('metadata') from None
    return metadata



def validate_archive(body):
    files = {}
    seen = set()
    total = 0
    try:
        with zipfile.ZipFile(io.BytesIO(body)) as archive:
            if not 0 < len(archive.infolist()) <= MAX_MEMBERS:
                raise Rejected('member count')
            for member in archive.infolist():
                name = member.filename
                parts = name.split('/')
                mode = member.external_attr >> 16
                if (not re.fullmatch(r'[A-Za-z0-9_.\-/]{1,200}', name)
                        or any(p in {'', '.', '..'} for p in parts)
                        or name.casefold() in seen or member.is_dir()
                        or stat.S_IFMT(mode) not in {0, stat.S_IFREG}
                        or member.flag_bits & 1
                        or member.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}
                        or Path(name).suffix not in EXTENSIONS
                        or (len(parts) != 1 and (len(parts) != 2 or parts[0] != 'assets'))
                        or name in {'_deployment.json', 'manifest.json'}):
                    raise Rejected('unsafe member')
                seen.add(name.casefold())
                total += member.file_size
                if member.file_size > MAX_MEMBER or total > MAX_EXPANDED:
                    raise Rejected('expanded size')
                with archive.open(member) as stream:
                    data = stream.read(MAX_MEMBER + 1)
                if len(data) != member.file_size or len(data) > MAX_MEMBER:
                    raise Rejected('member size')
                files[name] = data
        if not files.get('index.html'):
            raise Rejected('index missing')
    except (zipfile.BadZipFile, RuntimeError, OSError, EOFError, ValueError):
        raise Rejected('archive') from None
    return files


def sync_directory(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def atomic_json(path, value):
    fd, name = tempfile.mkstemp(prefix=path.name + '-', dir=path.parent)
    temp = Path(name)
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream, sort_keys=True)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
        sync_directory(path.parent)
    finally:
        temp.unlink(missing_ok=True)


def switch(root, target):
    link = root / '.current-next'
    link.unlink(missing_ok=True)
    link.symlink_to(target)
    os.replace(link, root / 'current')
    sync_directory(root)


def safe_target(target):
    return isinstance(target, str) and re.fullmatch(r'releases/[a-zA-Z0-9_-]+', target)


def recover(root):
    journal = root / '.pending.json'
    if journal.exists():
        old = json.loads(journal.read_bytes())['old']
        if old is None:
            (root / 'current').unlink(missing_ok=True)
            sync_directory(root)
        elif safe_target(old):
            switch(root, old)
        else:
            raise Rejected('unsafe recovery target')
        journal.unlink()
        try:
            sync_directory(root)
        except Exception:
            # Restoration happened, but journal removal is not durable. Keep
            # recovery evidence even if subsequent fsync attempts also fail.
            try:
                atomic_json(journal, {'old': old})
            except Exception:
                pass
            raise


def audit(root, status, metadata):
    path = root / '.audit.json'
    entries = json.loads(path.read_bytes()) if path.exists() else []
    entries.append({'status': status, 'sha': metadata['sha'], 'run_number': metadata['run_number'], 'time': int(time.time())})
    atomic_json(path, entries[-100:])


def publish(root, metadata, body, probe):
    metadata = validate_metadata(metadata)
    if not 0 < len(body) <= MAX_UPLOAD:
        raise Rejected('bounds')
    files = validate_archive(body)
    root = Path(root)
    if root.is_symlink() or not root.is_dir() or root.stat().st_mode & 0o022:
        raise Rejected('storage permissions')
    releases = root / 'releases'
    if releases.is_symlink():
        raise Rejected('storage symlink')
    if not releases.exists():
        releases.mkdir()
        releases.chmod(0o755)
        sync_directory(releases)
        sync_directory(root)
    with (root / '.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise Rejected('busy') from None
        recover(root)
        old = str((root / 'current').readlink()) if (root / 'current').is_symlink() else None
        if (root / 'current').exists() and old is None:
            raise Rejected('current is not a symlink')
        if old is not None and not safe_target(old):
            raise Rejected('unsafe current target')
        digest = hashlib.sha256(body).hexdigest()
        order = [metadata['run_number'], metadata['run_attempt']]
        if old and (root / old / 'manifest.json').exists():
            previous = json.loads((root / old / 'manifest.json').read_bytes())
            if order == previous['order'] and metadata['sha'] == previous['metadata']['sha'] and digest == previous['body_sha256']:
                probe(previous['hashes'])
                return {'status': 'idempotent', 'sha': metadata['sha']}
            if order <= previous['order']:
                raise Rejected('stale or conflicting delivery')
        marker = json.dumps({'sha': metadata['sha'], 'repository': REPOSITORY, 'deployment_id': metadata['deployment_id']}, sort_keys=True).encode()
        files['_deployment.json'] = marker
        hashes = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
        manifest = {'metadata': metadata, 'order': order, 'body_sha256': digest, 'hashes': hashes}
        target = f"releases/{metadata['sha']}-{order[0]}-{order[1]}-{digest}"
        destination = root / target
        stage = Path(tempfile.mkdtemp(prefix='.stage-', dir=root))
        pending = False
        try:
            for name, data in files.items():
                path = stage / name
                path.parent.mkdir(exist_ok=True)
                if path.parent != stage:
                    path.parent.chmod(0o755)
                with path.open('xb') as stream:
                    stream.write(data)
                    stream.flush()
                    os.fchmod(stream.fileno(), 0o444)
                    os.fsync(stream.fileno())
            atomic_json(stage / 'manifest.json', manifest)
            stage.chmod(0o755)
            # The allowlist permits only one created subdirectory, assets.
            if (stage / 'assets').exists():
                sync_directory(stage / 'assets')
            sync_directory(stage)
            if destination.exists():
                existing = json.loads((destination / 'manifest.json').read_bytes())
                comparable = {**existing, 'metadata': {**existing['metadata'], 'timestamp': metadata['timestamp']}}
                if destination.is_symlink() or comparable != manifest:
                    raise Rejected('immutable collision')
                for name, digest in hashes.items():
                    path = destination / name
                    if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                        raise Rejected('immutable corruption')
            else:
                os.rename(stage, destination)
            # A prior rename may have survived a failed parent fsync. Make the
            # destination and both rename parents durable on identical retries too.
            if (destination / 'assets').exists():
                sync_directory(destination / 'assets')
            sync_directory(destination)
            sync_directory(releases)
            sync_directory(root)
            pending = True
            atomic_json(root / '.pending.json', {'old': old})
            switch(root, target)
            probe(hashes)
            audit(root, 'published', metadata)
            (root / '.pending.json').unlink()
            sync_directory(root)
            return {'status': 'published', 'sha': metadata['sha']}
        except Exception:
            if pending:
                # A replace may have succeeded even though its fsync failed.
                # Restore immediately; a failed recovery fsync leaves the journal
                # for restart and must not mask the generic public error.
                if not (root / '.pending.json').exists():
                    try:
                        atomic_json(root / '.pending.json', {'old': old})
                    except Exception:
                        pass
                try:
                    recover(root)
                    audit(root, 'rolled-back', metadata)
                except Exception:
                    pass
            raise Rejected('publish failed') from None
        finally:
            if stage.exists():
                shutil.rmtree(stage)
