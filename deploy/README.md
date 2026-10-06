# Restricted-SSH static releases (production installation unproven)

Serving remains **Cloudflare Access → Traefik → Nginx**. Deployment goes directly to
`2.24.125.17:22` as a dedicated `tgdeploy` user, not through the Cloudflare hostname.
No HTTP receiver, HMAC, SCP/SFTP transport, Docker socket, sudo, or artifact
execution is exposed by this SSH publisher. Preserve the existing live receiver
and its credentials until replacement proof and separately authorized retirement.

## Protocol and trust boundary

`authorized_keys` and a fixed sanitized absolute wrapper accept only
`tg-publish-v1`; shell/subsystem/other commands are rejected without reading stdin.
Stdin is a ≤4096-byte JSON line (`metadata`, `size`, `sha256`), then ≤20MiB of ZIP
and EOF. Duplicate fields, extra/truncated data, hash mismatches, wrong
repository/ref/event/types and expired upload timestamps fail closed. Input has a
15-second absolute deadline. ZIP paths/types/extensions/count/expanded sizes are
bounded; files are data only. Atomic promotion, journal recovery, flock,
monotonic `[GITHUB_RUN_NUMBER,GITHUB_RUN_ATTEMPT]`, hash-bound idempotency, fsync
ordering and failed-origin rollback are retained. Artifact health verifies root
and every archive member with no redirects/proxy and a30-second total deadline.
The64MiB archive-member budget,16MiB repeated-root budget and256-byte generated
marker budget are separate; the marker also has an expected hash.

SSH authenticates the trusted main workflow. Metadata is not a GitHub signature:
a stolen deployment key can publish arbitrary allowlisted static content with
claimed metadata. Protect main and repository secrets. No fork/PR job receives
the key; `contents: read`, nonpersistent checkout credentials and unit/build/browser
gates remain. The final step verifies current main through GitHub before sending.
This is not atomic GitHub compare-and-swap; run ordering rejects older deliveries
after a newer one published. Do not recreate/rename the workflow without
explicitly migrating its run-order baseline. SSH failures are not retried
automatically; an identical frame is idempotent and a workflow rerun increases the
run attempt.

The client ignores user SSH config, pins the authoritatively discovered host key,
requires batch/key-only/identities-only authentication, disables agent forwarding,
multiplexing/general forwarding and uses a temporary mode0600 key. Secret values
never appear in argv or printed stderr. Future secret:
`TG_DEPLOY_SSH_PRIVATE_KEY`. Do not reuse an administrative/GitHub identity.
Pinned Ed25519 fingerprint:
`SHA256:z8JDznydJ62AGGhYcRDr5U/SX971zIDWs+ykgHKvmCQ`.
Host-key changes require fresh authoritative discovery/review, not ssh-keyscan trust.

## Tests

```sh
python3 -B -m unittest discover -s deploy -v
npm run build
npm test
# Fresh-from-base fixture build (requires package network):
docker build -f deploy/Dockerfile.ssh-test -t tg-ssh-pr12-test .
docker run --rm --network none --security-opt no-new-privileges tg-ssh-pr12-test
# Existing package-equipped pinned image, exact current code, fresh fixture keys:
python3 -B deploy/ssh-install/run_publisher_fixture.py
```

Never use/publish the fixture image or its keys in production. The fixture uses
no host mounts/socket, published ports, privileged mode or host networking.
Ordinary discovery skips seven explicit real-SSH tests, which are run separately.
See the installer runbook for isolated lifecycle/native/matrix commands and scope.

## Privileged installation and manual operator handoff

The complete public installer, tests and executable operator procedure live in
[`ssh-install/README.md`](ssh-install/README.md). **Exact relocated package review
and the final approved commit/checksums are pending; it is not a run-now release.**
The predecessor source/fixture verdict does not automatically approve packaging.
No production installation or automatic deployment has been proved.

The runbook specifies authenticated Ubuntu24.04 host-root console prerequisites,
private short-lived coherent inventory/backups, explicit native/deploy/legacy
writer exclusion, precreated closed admission controls, exact `prepare/check`,
interactive plan-SHA-bound `apply/recover/activate`, preactivation `verify`, real
SSH/PAM positive and negative acceptance, unchanged artifacts/order/other-user
policy, drift-aware recovery and external viewer/main-workflow proof.

The new release root is `/var/lib/tg-deploy`. Only the original data bind source
is replaced at its existing `/usr/share/nginx/html` destination, read-only;
the separate original Nginx config bind, image digest, host network/loopback9122,
Traefik and Cloudflare Access are preserved. Never open `/root` or Hermes's
credential tree to the deployment user. Installed code/wrapper and public SSH
controls are root-owned; the account cannot replace them. Missing/corrupt/closed
admission denies publication. Publication checks the fixed gate before and after
acquiring the canonical lock; FIFO controls are rejected without blocking.

Keep private baseline evidence, target inventory, account database backups,
production keys and journals outside Git. Installation is user-owned, not agent
execution. Secret publication follows verified restrictions only. PR merge,
genuine-main positive publication and legacy receiver/credential retirement are
separate authorizations. Do not invent workflow ordering/provenance to demonstrate
success. There is no unrestricted rollback SSH command.
