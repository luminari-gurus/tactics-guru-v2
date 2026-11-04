# Exact-base comparison: setup failure

The exact-base comparison job in [run 41839508793](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41839508793) checked out `fbf82420b82674dc5f57397d68b0a50c8bf485c0`, but ran zero cases: the preview server timed out because the job did not build the application first. This result does not attribute the hosted Chromium failure. The job was repaired to build before testing; this incomplete result is retained.
