# Signed beta releases

`release.yml` tests PRs without deployment credentials. Only `main` pushes or
manual runs of `main` can send a release to the **fixed** beta `/_deploy` endpoint.
It runs receiver tests, `npm ci`, typecheck/build, and all three production-preview
browser smoke projects on GitHub-hosted Ubuntu. Actions are pinned to upstream
commit SHAs. No self-hosted runner or origin build is involved.

## Protocol and limits

The request is `POST /_deploy`, `Content-Type: application/zip`, with exactly one
positive Content-Length, X-TG-Metadata and X-TG-Signature header. Chunked and encoded
bodies are rejected. Metadata is base64 of canonical JSON with repository, ref,
40-character SHA, event, Unix timestamp, run_number, run_attempt and deployment_id.
The hex HMAC-SHA256 signs `tactics-guru-static-release-v1\n` + the **exact base64
metadata string** + `\n` + the ZIP bytes. Authentication happens before ZIP parsing.
The key is a cryptographically generated 64-character hex string, used as UTF-8
bytes (not decoded hex); it lives outside Git, in a receiver file mode 0600 and the
single repository secret `TG_DEPLOY_HMAC_KEY`. Never paste it into command arguments.

Signed timestamps expire after 15 minutes (60 seconds future skew). Run number and
attempt establish monotonic order for this single workflow. Retries of an identical
successful order/SHA/body are idempotent; conflicting or older orders fail closed.
GitHub concurrency serializes the release job, and a fresh main-ref read skips
superseded builds. This is signed workflow ordering, not Git ancestry verification.
Do not reset workflow run-number history or create a second signer without a
reviewed migration of the stored order.

The ZIP cap is 20 MiB compressed, 64 MiB expanded, 16 MiB/member, 512 members.
Only root static files and one-level `assets/` files with allowlisted static
extensions are accepted. Links, duplicate/case-colliding names, traversal,
encryption, unsupported compression and runtime executables are rejected. An
index is mandatory. The receiver never runs release files, shell commands, builds,
or Docker. The receiver stores an internal manifest and a public minimal
`_deployment.json`; Nginx must block `manifest.json` and dotfiles.

## Receiver tests

```sh
python3 -m unittest discover -s deploy -v
npm ci
npm run build
npx playwright install --with-deps chromium
npm test
```

## Origin setup (operator-only; not automatic from this repository)

1. Independently review the exact source tree; collect a restricted rollback
   snapshot of this hostname's container, mounts, image digest, route, Access app
   and policy, Nginx config, and release checksums. Revalidate it immediately before
   switching. Preserve the original immutable release and original backups.
2. Create **dedicated** deploy storage, owned by receiver UID/GID 10001, mode 0755;
   no group/world write, no symlink parent. Copy the existing immutable static
   release into `releases/bootstrap-<sha>` and set a **relative** `current` symlink.
   Do not give the receiver write access to unrelated releases/backups/configs.
3. Build `deploy/Dockerfile` from its digest-pinned base. Run host-network receiver
   with restart `unless-stopped`, user 10001, read-only rootfs, no capabilities,
   no-new-privileges, pids/memory/CPU limits, only dedicated storage RW and key RO.
   No Docker socket, broad credentials, host root or Git checkout mounts. The
   receiver binds only host loopback. File ownership must allow its UID to read
   the exact mode-0600 key. No environment secret is required in the container.
4. Test on unused alternate ports with a **copy** of current build and storage:
   real signed POST, serving-root/artifact hashes, rejected signatures, replay,
   rollback, crash recovery and restart. Stop/remove test-only containers.
5. Migrate only the beta Nginx mount: dedicated stable parent RO at `/deploy`,
   `deploy/nginx.conf` RO. Test its alternate port before a guarded real-port switch;
   automatically restore the original container/config on any verification failure.
   `current` switch and release files must remain on the same filesystem. Disable
   Nginx open_file_cache for this root (default is off).
6. Add an exact highest-priority Traefik router for
   `Host(tg-beta.absoluteparallax.com) && Path(/_deploy) && Method(POST)` to the
   loopback receiver service, retaining the existing edge-IP/loopback allowlist.
   Keep all game routes protected and unchanged. Non-POST `/_deploy` returns 405.
   Deployment descendants return 404 for **every** method, including encoded paths
   and raw dot-segment paths; recursive percent encodings return 400. No descendant
   may fall through to SPA HTML. Verify this on the actual Nginx before edge changes.
7. Create a separate Cloudflare self-hosted Access app scoped to
   `tg-beta.absoluteparallax.com/_deploy`. Access also matches descendants, so the
   origin deny above is mandatory. Its **only** policy is Service Auth (`non_identity`)
   including one dedicated expiring service token; no Bypass, Everyone, email or
   interactive Allow policy. Keep the existing game Access app/DNS unchanged and
   verify this token cannot access game root/assets/metadata. HMAC remains mandatory.
8. Preserve the independent HMAC key. Set the repository secrets
   `TG_DEPLOY_CF_ACCESS_CLIENT_ID` and `TG_DEPLOY_CF_ACCESS_CLIENT_SECRET` using
   stdin, never command literals. Use a dedicated short-lived token (operator trial:
   720 hours), document expiry, and renew/rotate before expiry; do not broaden account
   policy. Read back names only. `upload.py` uses actual curl (required on the runner),
   its standard User-Agent, TLS verification, HTTPS-only transport, no redirects,
   bounded connect/total timeouts/retries and a 4096-byte response cap. Credentials
   are held in temporary mode-0600 headers within a mode-0700 directory, not argv;
   curl stderr and error response bodies are never logged. No global BIC/WAF changes.
   Validate missing/invalid token blocks at Cloudflare, valid token still rejects
   bad/missing HMAC, descendants deny, game still Access, direct origin 403, and
   actual workflow uploader succeeds and retries idempotently. Use the actual
   workflow run order; never invent high counters that block the first main release.
   Prove persistent storage and denial rules after receiver/origin restart.
9. Obtain explicit merge authorization. Merge only after independent review and
   CI pass, then observe the first main workflow's deployment acknowledgement and
   compare origin `_deployment.json` SHA to the exact merge commit. Before that,
   automatic main deployment is **not proven**.

## Atomic publication and rollback

An exclusive filesystem lock gates publication. Files are validated in memory,
written to a unique stage with serving directories mode 0755, static files mode
0444 and the receiver-only manifest mode 0600. These permissions let Nginx UID
101 traverse/read files owned by receiver UID 10001 without shared ownership or
host privilege changes. The operator-provisioned storage root must remain 0755.
File permissions are set before the final file fsync; created directories are
fsynced bottom-up, and both rename parents are synced before journal/switch work.
A durable rollback journal records the previous relative target before replacing
`current` atomically. The origin's root, metadata and every static asset must match
SHA256 hashes. Failures restore the previous target; restart recovers any pending
journal conservatively. Rollback follows the pending transaction even when the
symlink replace succeeded but its directory fsync failed. If recovery fsync keeps
failing, the previous target is restored best-effort and the journal retained for
restart; no durability guarantee can be made while storage fsync is failing.
Successfully verified current manifests are the ordering
source of truth. Only stage directories created by this call are cleaned up;
unknown releases/history are never deleted. Audit history is bounded to 100
structured publication/rollback records, without request headers or secrets.

The single-request receiver bounds active memory and work with a 15-second absolute
deadline covering request headers and body, as well as an inactivity timeout.
A deadline callback shuts down trickling sockets; it is cancelled and joined
before publication and on every exit, and connections are never reused. Malformed
signature/metadata syntax, bounds and context are rejected before body reads;
HMAC still verifies the complete body before any ZIP parsing. Parser errors and
public rejection responses contain only generic status, not request text/secrets.
The public endpoint can still be denied service by sustained anonymous uploads;
add a narrowly scoped edge rate limit if necessary, without weakening HMAC or game
Access. A stalled upload gets no success acknowledgement. Receiver rejection logs
are deliberately generic; use restricted container and audit evidence for diagnosis.
For operator rollback, stop the receiver first, restore the approved initial target
or original container from the restricted snapshot, verify all original checksums
and game Access, and only then restart a reviewed receiver. Don't manually edit the
current manifest or ordering state to replay an older release.

## Deferred nonblocking review suggestions

- Separate build and sign jobs to reduce deployment-key exposure to build tooling;
  this changes workflow architecture and is not part of the receiver fixes.
- The fresh main-ref snapshot can race with a subsequent main push. A stronger
  freshness/ancestry protocol needs separate design; the current check is advisory.
- Design an explicit release-retention policy separately. These fixes do not
  prune unknown releases, backups or history, nor change existing audit retention.
