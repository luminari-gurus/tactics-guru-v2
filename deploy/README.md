# Restricted-SSH static releases (installation not yet approved)

Serving remains **Cloudflare Access → Traefik → Nginx**. Deployment goes directly to
`2.24.125.17:22` as a dedicated `tgdeploy` user, not through the Cloudflare hostname.
There is no public HTTP receiver, HMAC, SCP, SFTP, Docker socket, sudo, or artifact
execution in this implementation. Existing live receiver/credentials must remain
until the replacement is installed and verified under separate approval.

## Protocol and trust boundary

`authorized_keys` runs a fixed absolute publisher. Only the exact client command
`tg-publish-v1` is accepted; shell/subsystem/other commands are rejected without
reading stdin. Stdin is a ≤4096-byte JSON line (`metadata`, `size`, `sha256`), then
≤20 MiB of ZIP and EOF. Duplicate fields, extra/truncated data, hash mismatches,
wrong repository/ref/event/types and expired timestamps fail closed. There is a
15-second absolute input deadline. ZIP paths/types/extensions/count/expanded sizes
are bounded; files are data only. Atomic promotion, journal recovery, flock,
monotonic `[GITHUB_RUN_NUMBER,GITHUB_RUN_ATTEMPT]`, hash-bound idempotency,
fsync ordering, and failed-origin rollback are retained. The origin verifies root
and every artifact hash with no redirects/proxy and a 30-second total deadline.

SSH authenticates the trusted main workflow. Metadata is not a GitHub signature:
a stolen deployment key can publish arbitrary allowlisted static content with
claimed metadata. Protect main and repository secrets accordingly. No fork/PR job
receives the key; `contents: read`, nonpersistent checkout credentials and the
existing unit/build/browser gates remain. The final step verifies current main
through GitHub before sending. This check is not an atomic GitHub compare-and-swap;
run ordering rejects older deliveries after a newer one has published. Do not
rename/recreate the release workflow without deliberately migrating its run-order
baseline. SSH failures are not retried automatically; an identical rerun frame is
idempotent and a workflow rerun increases the run attempt.

The client ignores user SSH config, pins the authoritatively discovered host key,
requires batch/key-only/identities-only authentication, disables agent forwarding
and multiplexed/general forwarding, and uses a temporary mode-0600 key file.
Secret values never appear in argv or printed stderr. Sole future secret name:
`TG_DEPLOY_SSH_PRIVATE_KEY`. Do not reuse the agent's administrative/GitHub key.
Pinned Ed25519 fingerprint: `SHA256:z8JDznydJ62AGGhYcRDr5U/SX971zIDWs+ykgHKvmCQ`.
Host-key changes require fresh authoritative discovery/review, not ssh-keyscan trust.

## Tests

```sh
python3 -m unittest discover -s deploy -v
npm run build
npm test
# Real sshd/key/forced-command/subsystem/PTY/forwarding integration, isolated:
docker build -f deploy/Dockerfile.ssh-test -t tg-ssh-pr12-test .
docker run --rm --network none --security-opt no-new-privileges tg-ssh-pr12-test
```

The pinned-base test image contains disposable fixture keys. **Never publish or
use this image or its keys in production.** No host mounts, published ports,
privileged mode, host networking or Docker socket are used by the fixture.
Ordinary unit discovery explicitly skips these four container-only integration
cases. The workflow runs the container integration separately before deployment.

## Separate production-installation approval checkpoint

Read-only discovery found Ubuntu 24.04 with Python 3.12 binary/stdlib and no
`tgdeploy` account. The existing Nginx data mount is under `/root/.hermes`; do not
open `/root` or the Hermes credential tree to a deployment user. No production
installation, account, key, sshd, firewall, Access, DNS, route, or merge has occurred.

A separately approved operator must revalidate exact reviewed SHA and live baseline,
then prepare a reviewed, guarded installer/dry-run before applying these changes:

1. Back up exact existing Nginx container configuration, source mount, release link,
   metadata and all artifact hashes; retain durable rollback evidence outside Git.
   Confirm host Python works with `-I`, effective per-user `sshd -T -C` policy,
   account absence, UID/group choices and directory owner/modes. The read-only
   discovery found contradictory sshd snippets; do not infer effective policy from
   filename order or change existing users' authentication.
2. Create only `tgdeploy` with `/bin/sh` (sshd internally needs an executable shell),
   locked password, no supplementary groups/sudo/Docker access. Root owns
   `/home/tgdeploy` and `.ssh` mode0755, `authorized_keys` mode0644. These contain
   only public material, are readable by the user and not replaceable by it.
   Verify ALL parent owner/modes and no symlink components. No user rc/profile files.
3. Install only reviewed `forced_publish.py` and `release.py` in
   `/usr/local/lib/tg-deploy`, root-owned directory0755/files0644 and root-owned,
   non-group/world-writable ancestors. Fixed authorized-key options:
   `restrict,command="/usr/bin/python3 -I /usr/local/lib/tg-deploy/forced_publish.py"`
   followed by a **new dedicated Ed25519 public key**. `restrict` disables PTY,
   agent/port/X11 forwarding and user rc. Additionally a scoped `Match User tgdeploy`
   must require publickey, disable password/keyboard-interactive/user environment,
   `DisableForwarding yes`, `PermitTTY no`, `PermitUserRC no`, and repeat this
   absolute `ForceCommand`. Validate syntax/effective policy before reload; do not
   alter or relax global SSH settings or other accounts.
4. Prepare `/var/lib/tg-deploy` mode0755 owned solely by tgdeploy, with root-owned
   nonwritable ancestors. Copy the original immutable release/hash evidence into
   its `releases/` and atomic `current` link under an exclusive maintenance lock.
   Nginx must read the whole parent at `/deploy` **read-only**, not a resolved link;
   update only its data bind source to `/var/lib/tg-deploy`, retaining the exact
   config, image, loopback port9122 and Traefik/Access path. Never expose `/root`.
   Verify unchanged original artifact hashes before enabling upload.
5. Generate the new private key outside Git at mode0600 and publish only to the
   named GitHub secret by stdin after host restrictions pass. No values in reports.
   Existing public SSH reachability is the intended network path; GitHub-hosted
   runner IPs are dynamic. Do not hardcode stale IP ranges or change firewall here.
6. Exercise real production key auth, denied shell/SFTP/SCP/PTY/forwarding, a bounded
   reviewed artifact, all origin hashes, idempotency, negative/replay cases and
   receiver-independent restart proof. Reverify Access denial and direct-origin
   protection without changing Cloudflare. Actual automatic-main deployment is
   not proven until a separately approved main push completes and origin SHA agrees.
7. Only AFTER replacement verification and separate retirement approval: stop the
   old receiver and remove its dedicated credentials/service token. Keep historical
   rollback records; remove no shared token/policy. PR merge is separate approval.

Rollback during installation: disable the new deploy key/account first, restore the
exact prior Nginx bind/config/container and original `current`/artifact hashes;
retain old receiver/secrets until proven replacement. After publication, automatic
probe failure restores the prior link; operational rollback is admin-controlled,
uses the recorded exact release link, flock and fsync, and is verified against every
original artifact hash. No unrestricted rollback SSH command is provided.
