import hashlib
import io
import json
import tempfile
import time
import unittest
import zipfile
from pathlib import Path

try:
    import release
except ImportError:
    release = None


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(release, 'signed release implementation missing')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

        self.meta = dict(repository='luminari-gurus/tactics-guru-v2', ref='refs/heads/main',
                         sha='a' * 40, event='push', timestamp=int(time.time()),
                         run_number=1, run_attempt=1, deployment_id='123')

    def archive(self, entries=None):
        output = io.BytesIO()
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name, value in entries or [('index.html', b'<html>ok</html>'), ('assets/game.js', b'game')]:
                archive.writestr(name, value)
        return output.getvalue()

    def deliver(self, body=None, meta=None, probe=None):
        body = self.archive() if body is None else body
        meta = self.meta if meta is None else meta
        return release.publish(self.root, meta, body, probe or (lambda files: None))

    def test_publish_hashes_and_idempotency(self):
        self.assertEqual(self.deliver()['status'], 'published')
        target = (self.root / 'current').resolve()
        self.assertEqual((target / 'index.html').read_bytes(), b'<html>ok</html>')
        self.assertEqual(self.deliver()['status'], 'idempotent')
        self.assertEqual((self.root / 'current').resolve(), target)

    def test_metadata_shape_bound(self):
        for meta in [[], {**self.meta, 'extra': 1}, {'sha': 'a'*40}]:
            with self.subTest(meta=meta), self.assertRaises(release.Rejected):
                self.deliver(meta=meta)

    def test_wrong_context_stale_and_invalid_types(self):
        for field, value in [('repository', 'evil/repo'), ('ref', 'refs/heads/dev'),
                             ('event', 'pull_request'), ('timestamp', 0),
                             ('timestamp', int(time.time()) + 1000), ('sha', '../evil'),
                             ('run_number', True), ('run_attempt', 0), ('deployment_id', '../x')]:
            with self.subTest(field=field), self.assertRaises(release.Rejected):
                self.deliver(meta={**self.meta, field: value})

    def test_unsafe_archives(self):
        cases = [[('../x.js', b'x')], [('/x.js', b'x')], [('assets/../x.js', b'x')],
                 [('index.html', b'x'), ('index.html', b'y')],
                 [('index.html', b'x'), ('INDEX.html', b'y')],
                 [('index.html', b'x'), ('run.py', b'x')], [('assets/x.js', b'x')],
                 [('index.html', b'x'), ('assets/x.js/y.js', b'x')],
                 [('index.html', b'x'), ('assets/x\\y.js', b'x')]]
        for entries in cases:
            with self.subTest(entries=entries), self.assertRaises(release.Rejected):
                self.deliver(body=self.archive(entries))
        with self.assertRaises(release.Rejected):
            self.deliver(body=b'not zip')
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as z:
            info = zipfile.ZipInfo('index.html')
            info.create_system = 3
            info.external_attr = 0o120777 << 16
            z.writestr(info, '/etc/passwd')
        with self.assertRaises(release.Rejected):
            self.deliver(body=out.getvalue())

    def test_archive_limits(self):
        from unittest.mock import patch
        with patch.object(release, 'MAX_UPLOAD', 10), self.assertRaises(release.Rejected):
            self.deliver()
        with patch.object(release, 'MAX_EXPANDED', 10), self.assertRaises(release.Rejected):
            self.deliver()
        with patch.object(release, 'MAX_MEMBER', 10), self.assertRaises(release.Rejected):
            self.deliver()
        with patch.object(release, 'MAX_MEMBERS', 1), self.assertRaises(release.Rejected):
            self.deliver()

    def test_failed_origin_rolls_back_and_retry_works(self):
        self.deliver()
        old = (self.root / 'current').readlink()
        newer = {**self.meta, 'sha': 'b' * 40, 'run_number': 2}
        def fail(files):
            raise OSError('origin 404 / wrong hash')
        with self.assertRaises(release.Rejected):
            self.deliver(meta=newer, probe=fail)
        self.assertEqual((self.root / 'current').readlink(), old)
        self.assertEqual(self.deliver(meta=newer)['status'], 'published')
        self.assertFalse(list(self.root.glob('.stage-*')))

    def test_stale_order_conflicting_retry_and_new_attempt(self):
        self.deliver(meta={**self.meta, 'run_number': 2})
        with self.assertRaises(release.Rejected):
            self.deliver()
        with self.assertRaises(release.Rejected):
            self.deliver(meta={**self.meta, 'run_number': 2, 'sha': 'b' * 40})
        with self.assertRaises(release.Rejected):
            self.deliver(meta={**self.meta, 'run_number': 2}, body=self.archive([('index.html', b'changed')]))
        self.assertEqual(self.deliver(meta={**self.meta, 'run_number': 2, 'run_attempt': 2})['status'], 'published')

    def test_busy_lock_rejects_without_switch(self):
        import fcntl
        with (self.root / '.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(release.Rejected):
                self.deliver()
        self.assertFalse((self.root / 'current').exists())

    def test_retry_after_failed_probe_with_fresh_timestamp(self):
        def fail(files):
            raise OSError('bad origin')
        with self.assertRaises(release.Rejected):
            self.deliver(probe=fail)
        self.assertEqual(self.deliver(meta={**self.meta, 'timestamp': self.meta['timestamp'] + 1})['status'], 'published')

    def test_crash_recovery_restores_previous_release(self):
        self.deliver()
        old = str((self.root / 'current').readlink())
        release.atomic_json(self.root / '.pending.json', {'old': old})
        release.switch(self.root, 'releases/interrupted')
        release.recover(self.root)
        self.assertEqual(str((self.root / 'current').readlink()), old)
        self.assertFalse((self.root / '.pending.json').exists())

    def test_separate_uid_serving_permissions(self):
        import stat
        # Model POSIX 'other' access: receiver 10001 and nginx 101 share no
        # ownership/group. No chown, setuid, root, or host permission changes.
        self.root.chmod(0o755)
        self.deliver()
        target = (self.root / 'current').resolve()
        for directory in (self.root, self.root / 'releases', target, target / 'assets'):
            mode = stat.S_IMODE(directory.stat().st_mode)
            self.assertEqual(mode, 0o755, directory)
            self.assertEqual(mode & 0o005, 0o005, directory)
        for name in ('index.html', 'assets/game.js', '_deployment.json'):
            self.assertEqual(stat.S_IMODE((target / name).stat().st_mode), 0o444)
        self.assertEqual(stat.S_IMODE((target / 'manifest.json').stat().st_mode), 0o600)

    def test_sync_failure_after_switch_restores_old_target(self):
        from unittest.mock import patch
        self.deliver()
        old = (self.root / 'current').readlink()
        newer = {**self.meta, 'sha': 'b' * 40, 'run_number': 2}
        real_sync = release.sync_directory
        for persistent in (False, True):
            failed = False
            def sync(path):
                nonlocal failed
                if Path(path) == self.root and (self.root / 'current').readlink() != old:
                    failed = True
                    raise OSError('switch durability failure')
                if failed and persistent:
                    raise OSError('persistent durability failure')
                real_sync(path)
            with self.subTest(persistent=persistent):
                with patch.object(release, 'sync_directory', side_effect=sync):
                    with self.assertRaises(release.Rejected):
                        self.deliver(meta=newer)
                self.assertTrue(failed)
                self.assertEqual((self.root / 'current').readlink(), old)
                self.assertEqual((self.root / '.pending.json').exists(), persistent)
                if persistent:
                    release.recover(self.root)

    def test_recovery_journal_retained_when_removal_sync_fails(self):
        from unittest.mock import patch
        self.deliver()
        old = str((self.root / 'current').readlink())
        release.atomic_json(self.root / '.pending.json', {'old': old})
        release.switch(self.root, 'releases/interrupted')
        real_sync = release.sync_directory
        def sync(path):
            if not (self.root / '.pending.json').exists():
                raise OSError('journal removal sync failure')
            real_sync(path)
        with patch.object(release, 'sync_directory', side_effect=sync):
            with self.assertRaises(OSError):
                release.recover(self.root)
        self.assertEqual(str((self.root / 'current').readlink()), old)
        self.assertTrue((self.root / '.pending.json').exists())
        self.assertEqual(json.loads((self.root / '.pending.json').read_bytes()), {'old': old})
        release.recover(self.root)
        self.assertFalse((self.root / '.pending.json').exists())

    def test_file_permissions_and_bottom_up_directory_sync_before_promotion(self):
        import os
        import stat
        from unittest.mock import patch
        events = []
        real_fsync, real_sync, real_rename = os.fsync, release.sync_directory, os.rename
        real_json = release.atomic_json
        def atomic_json(path, value):
            if path == self.root / '.pending.json':
                events.append(('journal', path, None))
            return real_json(path, value)
        def fsync(fd):
            path = Path(os.readlink(f'/proc/self/fd/{fd}'))
            if path.is_file():
                events.append(('file', path, stat.S_IMODE(os.fstat(fd).st_mode)))
            real_fsync(fd)
        def sync(path):
            events.append(('dir', Path(path), None))
            real_sync(path)
        def rename(source, destination):
            events.append(('promote', Path(source), None))
            real_rename(source, destination)
        with patch.object(os, 'fsync', side_effect=fsync), \
                patch.object(release, 'sync_directory', side_effect=sync), \
                patch.object(release, 'atomic_json', side_effect=atomic_json), \
                patch.object(os, 'rename', side_effect=rename):
            self.deliver()
        promotion = next(i for i, event in enumerate(events) if event[0] == 'promote')
        stage = events[promotion][1]
        for name in ('index.html', 'assets/game.js', '_deployment.json'):
            self.assertIn(('file', stage / name, 0o444), events[:promotion])
        assets_sync = events.index(('dir', stage / 'assets', None))
        stage_sync = max(i for i, event in enumerate(events[:promotion])
                         if event == ('dir', stage, None))
        self.assertLess(assets_sync, stage_sync)
        self.assertLess(stage_sync, promotion)
        self.assertIn(('dir', self.root / 'releases', None), events[:promotion])
        self.assertIn(('dir', self.root / 'releases', None), events[promotion + 1:])
        self.assertIn(('dir', self.root, None), events[promotion + 1:])
        destination = (self.root / 'current').resolve()
        journal = events.index(('journal', self.root / '.pending.json', None))
        durable = events[promotion + 1:journal]
        positions = []
        for directory in (destination / 'assets', destination, self.root / 'releases', self.root):
            self.assertIn(('dir', directory, None), durable)
            positions.append(durable.index(('dir', directory, None)))
        self.assertEqual(positions, sorted(positions))

    def test_retained_retry_syncs_destination_and_rename_parents_before_journal(self):
        from unittest.mock import patch
        self.deliver()
        old = (self.root / 'current').readlink()
        releases = self.root / 'releases'
        unknown = releases / 'unknown-history'
        unknown.mkdir()
        (unknown / 'keep').write_bytes(b'history')
        newer = {**self.meta, 'sha': 'b' * 40, 'run_number': 2}
        body = self.archive()
        real_sync, real_json, real_switch = release.sync_directory, release.atomic_json, release.switch
        promoted = []
        real_rename = release.os.rename
        def rename(source, destination):
            real_rename(source, destination)
            promoted.append(Path(destination))
        def fail_releases_sync(path):
            if Path(path) == releases:
                self.assertEqual(len(promoted), 1, 'failure must follow successful rename')
                self.assertTrue(promoted[0].is_dir())
                raise OSError('releases durability failure after rename')
            real_sync(path)
        with patch.object(release.os, 'rename', side_effect=rename), \
                patch.object(release, 'sync_directory', side_effect=fail_releases_sync):
            with self.assertRaisesRegex(release.Rejected, 'publish failed'):
                self.deliver(meta=newer, body=body)
        self.assertEqual(len(promoted), 1)
        destination = promoted[0]
        self.assertEqual((self.root / 'current').readlink(), old)
        self.assertFalse((self.root / '.pending.json').exists())
        self.assertTrue(destination.is_dir())
        self.assertFalse(list(self.root.glob('.stage-*')))
        events = []
        def sync(path):
            real_sync(path)
            events.append(('sync', Path(path)))
        def atomic_json(path, value):
            if path == self.root / '.pending.json':
                events.append(('journal', path))
            return real_json(path, value)
        def switch(root, target):
            self.assertIn(('journal', self.root / '.pending.json'), events)
            events.append(('switch', root / target))
            return real_switch(root, target)
        def probe(hashes):
            self.assertIn(('switch', destination), events)
            events.append(('probe', destination))
        with patch.object(release, 'sync_directory', side_effect=sync), \
                patch.object(release, 'atomic_json', side_effect=atomic_json), \
                patch.object(release, 'switch', side_effect=switch), \
                patch.object(release.os, 'rename', side_effect=AssertionError('retry must retain destination')):
            result = self.deliver(meta=newer, body=body, probe=probe)
        self.assertEqual(result['status'], 'published')
        before_journal = events[:events.index(('journal', self.root / '.pending.json'))]
        positions = []
        for directory in (destination / 'assets', destination, releases, self.root):
            self.assertIn(('sync', directory), before_journal,
                          'retained release must be durable before journal creation')
            positions.append(before_journal.index(('sync', directory)))
        self.assertEqual(positions, sorted(positions))
        self.assertIn(('probe', destination), events)
        self.assertEqual((self.root / 'current').resolve(), destination)
        self.assertFalse((self.root / '.pending.json').exists())
        self.assertEqual((unknown / 'keep').read_bytes(), b'history')

    def test_assets_directory_sync_failure_never_promotes_or_deletes_history(self):
        from unittest.mock import patch
        self.deliver()
        old = (self.root / 'current').readlink()
        unknown = self.root / 'releases' / 'unknown-history'
        unknown.mkdir()
        (unknown / 'keep').write_bytes(b'history')
        real_sync = release.sync_directory
        def sync(path):
            if Path(path).name == 'assets':
                raise OSError('assets durability failure')
            real_sync(path)
        with patch.object(release, 'sync_directory', side_effect=sync):
            with self.assertRaises(release.Rejected):
                self.deliver(meta={**self.meta, 'run_number': 2})
        self.assertEqual((self.root / 'current').readlink(), old)
        self.assertEqual((unknown / 'keep').read_bytes(), b'history')
        self.assertEqual(len(list((self.root / 'releases').iterdir())), 2)
        self.assertFalse(list(self.root.glob('.stage-*')))

    def test_symlink_storage_rejected(self):
        (self.root / 'releases').symlink_to('/tmp')
        with self.assertRaises(release.Rejected):
            self.deliver()


if __name__ == '__main__':
    unittest.main()
