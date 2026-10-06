"""Package tested dist and deliver a signed release; redirects are never followed."""
import io
import json
import os
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

from receiver import NoRedirect
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


def deliver(body, value, key):
    signed = signed_headers(key, value, body)
    headers = {'Content-Type': 'application/zip', 'Content-Length': str(len(body)),
               'X-TG-Metadata': signed['metadata'], 'X-TG-Signature': signed['signature']}
    opener = urllib.request.build_opener(NoRedirect())
    for attempt in range(MAX_ATTEMPTS):
        request = urllib.request.Request(ENDPOINT, data=body, headers=headers, method='POST')
        try:
            with opener.open(request, timeout=UPLOAD_TIMEOUT) as response:
                result = json.loads(response.read(4096))
                if response.status != 200 or result.get('status') not in {'published', 'idempotent'} or result.get('sha') != value['sha']:
                    raise ValueError('unexpected deployment response')
                return result
        except urllib.error.HTTPError as error:
            if error.code not in {429, 502, 503, 504} or attempt == MAX_ATTEMPTS - 1:
                raise RuntimeError(f'deploy HTTP {error.code}; no response body logged') from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == MAX_ATTEMPTS - 1:
                raise RuntimeError('deploy transport unavailable') from None
        time.sleep(5 * (attempt + 1))
    raise RuntimeError('deployment not acknowledged')


def main():
    key = os.environ.pop('TG_DEPLOY_HMAC_KEY').encode()
    if len(key) < 32:
        raise ValueError('deployment key too short')
    result = deliver(package('dist'), metadata(), key)
    print(json.dumps(result, sort_keys=True))


if __name__ == '__main__':
    main()
