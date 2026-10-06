import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import release
try:
    import upload
except ImportError:
    upload = None


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(upload, 'release uploader implementation missing')

    def test_pack_round_trip_and_deterministic_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('<html>ok</html>')
            (root / 'assets').mkdir()
            (root / 'assets' / 'a.js').write_text('game')
            body = upload.package(root)
            self.assertEqual(body, upload.package(root))
            self.assertEqual(release.validate_archive(body)['assets/a.js'], b'game')
            (root / 'assets' / 'link.js').symlink_to('/etc/passwd')
            with self.assertRaises(ValueError):
                upload.package(root)

    def test_github_metadata_bound_to_approved_context(self):
        env = dict(GITHUB_REPOSITORY=release.REPOSITORY, GITHUB_REF='refs/heads/main',
                   GITHUB_SHA='a' * 40, GITHUB_EVENT_NAME='push', GITHUB_RUN_NUMBER='1',
                   GITHUB_RUN_ATTEMPT='1', GITHUB_RUN_ID='123')
        with patch.dict(os.environ, env):
            metadata = upload.metadata()
            self.assertEqual(metadata['repository'], release.REPOSITORY)
            headers = release.signed_headers(b'x' * 32, metadata, b'zip')
            self.assertEqual(release.authenticate(b'x' * 32, headers, b'zip'), metadata)
        with patch.dict(os.environ, {**env, 'GITHUB_REF': 'refs/heads/feature'}):
            with self.assertRaises(release.Rejected):
                upload.metadata()


if __name__ == '__main__':
    unittest.main()
