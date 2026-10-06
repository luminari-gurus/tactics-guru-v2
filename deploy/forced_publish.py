"""Fixed authorized_keys command: bounded JSON line + ZIP bytes + EOF."""
import hashlib
import io
import json
import os
import re
import select
import signal
import stat
import sys
import time
from pathlib import Path

COMMAND = 'tg-publish-v1'
ROOT = Path('/var/lib/tg-deploy')
ORIGIN = 'http://127.0.0.1:9122'
ADMIN_UID = 0
Rejected = ValueError  # Bootstrap errors never need an unverified sibling import.


def check_code(script, boundary=None):
    script = Path(script).absolute()
    for path in [script, *script.parents]:
        info = path.lstat()
        if (info.st_uid != ADMIN_UID or info.st_mode & 0o022
                or stat.S_ISLNK(info.st_mode)
                or not (stat.S_ISREG(info.st_mode) if path == script else stat.S_ISDIR(info.st_mode))):
            raise Rejected('code permissions')
        if path == boundary:
            break


if __name__ == '__main__':
    check_code(Path(__file__))
    check_code(Path(__file__).with_name('release.py'))
# -I ignores PYTHONPATH/user site; only our admin-controlled sibling is imported.
sys.path.insert(0, str(Path(__file__).absolute().parent))
from release import MAX_MEMBER, MAX_UPLOAD, Rejected, publish, validate_metadata


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejected('duplicate field')
        result[key] = value
    return result


def read_frame(stream, timeout=15):
    deadline = time.monotonic() + timeout
    def read(size):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise Rejected('deadline')
        if isinstance(stream, io.BytesIO):
            return stream.read(size)
        if not select.select([stream.fileno()], [], [], remaining)[0]:
            raise Rejected('deadline')
        return os.read(stream.fileno(), size)
    header = bytearray()
    while True:
        char = read(1)
        if char == b'\n':
            break
        if not char or len(header) >= 4096:
            raise Rejected('header bounds')
        header.extend(char)
    try:
        value = json.loads(header, object_pairs_hook=unique_object)
        if (not isinstance(value, dict) or set(value) != {'metadata', 'size', 'sha256'}
                or type(value['size']) is not int or not 0 < value['size'] <= MAX_UPLOAD
                or not isinstance(value['sha256'], str)
                or not re.fullmatch('[0-9a-f]{64}', value['sha256'])):
            raise Rejected('frame')
        metadata = validate_metadata(value['metadata'])
    except (ValueError, TypeError, KeyError, UnicodeError, RecursionError):
        raise Rejected('frame') from None
    body = bytearray()
    while len(body) < value['size']:
        chunk = read(min(65536, value['size'] - len(body)))
        if not chunk:
            raise Rejected('short body')
        body.extend(chunk)
    if read(1) or hashlib.sha256(body).hexdigest() != value['sha256']:
        raise Rejected('body')
    return metadata, bytes(body)


def origin_probe(hashes):
    import urllib.request
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args):
            return None
    def expire(*args):
        raise OSError('probe deadline')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    previous = signal.signal(signal.SIGALRM, expire)
    signal.setitimer(signal.ITIMER_REAL, 30)
    try:
        for name, digest in [('', hashes['index.html']), *hashes.items()]:
            req = urllib.request.Request(ORIGIN + '/' + name, headers={'Cache-Control': 'no-cache'})
            with opener.open(req, timeout=3) as response:
                if response.status != 200 or hashlib.sha256(response.read(MAX_MEMBER + 1)).hexdigest() != digest:
                    raise OSError('origin mismatch')
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous)


def receive(command, stream, root, probe):
    if command != COMMAND:
        raise Rejected('command')
    metadata, body = read_frame(stream)
    return publish(root, metadata, body, probe)


def main():
    try:
        # No arguments, arbitrary paths, shell evaluation, or artifact execution.
        if len(sys.argv) != 1:
            raise Rejected('arguments')
        info = ROOT.lstat()
        if info.st_uid != os.getuid() or info.st_mode & 0o022 or not stat.S_ISDIR(info.st_mode):
            raise Rejected('storage ownership')
        result = receive(os.environ.get('SSH_ORIGINAL_COMMAND', ''), sys.stdin.buffer, ROOT, origin_probe)
        print(json.dumps(result, sort_keys=True))
        return 0
    except Exception:
        print('{"status":"rejected"}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
