# SSH installation: operator runbook (exact-package review pending)

**STOP: this working package is not yet an approved, committed run-now release.**
Independent review approved the predecessor source and isolated acceptance, not
these relocated bytes, new import bootstrap, public fixture helpers, or this
runbook. Obtain independent exact-package review, then the final approved full
commit SHA and checksum-file digest through a trusted channel before use.
Production execution belongs to the user at an authenticated VPS console. No
agent installation, key/account change, secret publication, merge, or retirement
is authorized by this document. CLI output intentionally retains
`installation_ready: false` and conservative candidate warnings.

## Scope and invariants

Serving remains Cloudflare Access → Traefik → loopback Nginx. SSH deployment goes
to `2.24.125.17:22`, user `tgdeploy`, exact command `tg-publish-v1`. No HTTP
receiver, SCP/SFTP transport, artifact execution, sudo, or Docker access is granted
to that user. The privileged installer uses the host Docker API only for the exact
operator-supplied container ID. No Cloudflare, DNS, Access, firewall or viewer
routing changes are made. Preserve legacy receiver, HMAC/service tokens, source
release tree, original container, and private rollback evidence.

Fixed paths (not configurable through input):

| Purpose | Path / invariant |
|---|---|
| Original release data | `/root/.hermes/tactics-guru-v2-beta/signed-deploy` |
| Original config | `/root/.hermes/tactics-guru-v2-beta/signed-nginx.conf` |
| New release root | `/var/lib/tg-deploy`, created by installer; absent initially |
| Installed public code | `/usr/local/lib/tg-deploy`, root:root0755; Python0644; wrapper0755 |
| Account | `tgdeploy`, UID/GID11002, locked password, `/bin/sh`, no supplementary privilege |
| Home | `/home/tgdeploy`, root:root0755; absent initially; no user-writable startup files |
| Public SSH controls | `/etc/tg-deploy`, root:root0755; files root:root0644 |
| Key policy | `/etc/tg-deploy/authorized_keys`, fixed forced command + `restrict` |
| Admission / canonical lock | `/etc/tg-deploy/admission.gate`, `publication.lock` |
| Owned SSH snippet | `/etc/ssh/sshd_config.d/policy.conf`, absent initially |
| SSH / health | actual systemd `ssh` reload; direct IPv4 `127.0.0.1:9122` artifact hashes |
| Docker data/config destinations | `/usr/share/nginx/html`, `/etc/nginx/nginx.conf`, exactly two read-only binds |

Only the data bind source is migrated. Image digest, complete Config/HostConfig,
network (`host`), original configuration, other accounts' effective SSH policy,
existing `current`, artifact hashes, marker and release ordering are bound and
preserved. Do not fabricate provenance or advance counters. The known historical
order `[2,1]` is not a synthetic workflow run; the fresh inventory must confirm the
actual original order/metadata rather than overwrite it with this example.

## 1. Administrative and source prerequisites (user only)

Use the VPS provider's authenticated **local root console**, not an SSH shell,
container shell, `nsenter`, or a forced command. Guard requires Ubuntu24.04,
systemd PID1, root, interactive stdin, identical PID1 mount/PID/user/network
namespaces, and no `SSH_CONNECTION`/`SSH_ORIGINAL_COMMAND`. A Docker socket in an
agent container is not this prerequisite. Keep the provider console available
through recovery. Do not disable the guard or unset SSH variables to imitate it.

Verify host Python3 (Ubuntu3.12), Git, OpenSSH client/server, native
`useradd/userdel/groupadd/groupdel/getent`, systemctl, Docker API and filesystem
fsync work on the host. The fixed binaries must be trusted root-owned files and
ancestors. Read-only preflight rejects symlinks, writable ancestors, aliases,
xattrs, unexpected native/PAM/NSS/SSH drift, UID/GID11002 collisions and any
existing dedicated account/group/home/code/new release root. No global
`AllowUsers`, inherited `AcceptEnv`, or other account authentication relaxation is
allowed. Context-specific policy differences or unsupported Docker normalization
are stop conditions, not permission to edit globals.

Install a clean checkout of the **final separately approved commit**, under
root-controlled ancestors (directories0755, public code0644, executables0755;
never group/world writable). These commands are examples for an absent checkout:

```sh
umask 022
install -d -o root -g root -m 0755 /usr/local/src
# Set to the actual final full 40-character SHA received from the reviewer.
APPROVED_COMMIT='<approved-full-commit-SHA>'
git clone https://github.com/luminari-gurus/tactics-guru-v2.git /usr/local/src/tactics-guru-v2
git -C /usr/local/src/tactics-guru-v2 checkout --detach "$APPROVED_COMMIT"
cd /usr/local/src/tactics-guru-v2
test "$(git rev-parse HEAD)" = "$APPROVED_COMMIT"
test -z "$(git status --porcelain --untracked-files=all)"
# First compare this digest with the separately authenticated review receipt.
sha256sum deploy/ssh-install/SHA256SUMS
sha256sum --check deploy/ssh-install/SHA256SUMS
/usr/bin/python3 -I -B deploy/ssh-install/console-candidate/console_cli.py --help
```

Do not run builds/tests in this production checkout or put private input/evidence
under it: inventory requires a wholly clean checkout. Do not recursively chmod
`/root`, Hermes, SSH or account databases. If an existing path has incompatible
ownership, stop and inspect it; do not overwrite or repair unknown state.
`SOURCE-MANIFEST.json` lists named production/test/public-code SHA256s and
predecessor-to-package mappings. `SHA256SUMS` binds that manifest and public
package/deployment files, excluding itself to avoid recursive self-hashing.
Hashes are integrity bindings, **not signatures or proof of approver identity**.
Repository HEAD is bound by the private host plan, so no self-referential commit
SHA is embedded in the manifest.

Confirm the authoritative **public** Ed25519 host key locally:

```sh
ssh-keygen -l -E sha256 -f /etc/ssh/ssh_host_ed25519_key.pub
```

It must match the independently verified uploader pin
`SHA256:z8JDznydJ62AGGhYcRDr5U/SX971zIDWs+ykgHKvmCQ` and the public key literal in
`deploy/ssh_upload.py`. Stop on mismatch; do not trust unauthenticated ssh-keyscan.
The user must already hold a dedicated production Ed25519 private key locally,
mode0600, outside Git/chat, accessible to root on the console. Copy only its raw
public half into the private input directory; this document does not generate or
publish production keys. Python checks private-key metadata; ssh-keygen/ssh use
it locally. Private key bytes are never read into Python reports or shared logs.

## 2. Exclusive maintenance and precreated controls

Before declaring a lease, the operator must actually exclude native account/SSH
writers (automation, concurrent admins, identity provisioning) and all new and
legacy deploy writers. Close legacy admission by the site's separately reviewed
existing operational procedure; wait for its writers to drain, keep it closed.
No generic service-stop command can safely infer that site's exclusion mechanism.
An `flock` or JSON boolean **cannot substitute** for this explicit offline writer
exclusion. Do not retire the legacy receiver or credentials.

Confirm each destination below is absent first. On conflict stop; `install`
would otherwise overwrite it. The precreation itself is user-owned privileged
work, not a dry-run. Keep the original legacy `.lock` inode intact.

```sh
# Run ONLY after checking all these exact names are absent and ancestors trusted.
install -d -o root -g root -m 0755 /etc/tg-deploy
install -m 0644 -o root -g root /dev/null /etc/tg-deploy/authorized_keys
install -m 0644 -o root -g root /dev/null /etc/tg-deploy/publication.lock
/usr/bin/python3 -I -B -c 'import os; p="/etc/tg-deploy/admission.gate"; fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o644); os.write(fd,b"maintenance\n"); os.fsync(fd); os.close(fd)'
install -d -o root -g root -m 0700 /var/lib/tg-ssh-install
install -d -o root -g root -m 0700 /var/lib/tg-ssh-install/transaction
/usr/bin/python3 -I -B -c 'import os; from pathlib import Path; root=Path("/etc/tg-deploy"); paths=[root/"authorized_keys",root/"publication.lock",root/"admission.gate",root]; [(os.fsync(fd),os.close(fd)) for p in paths for fd in [os.open(p,os.O_RDONLY|os.O_NOFOLLOW)]]'
```

Check owner/mode/bytes using `stat` and `od`, and fsync the three files and their
parent before planning. Evidence/plan/backups/journal must stay root-private0700
with private files0600, outside Git and outside `/var/lib/tg-deploy`. The account
and file journals require compatible same-filesystem boundaries; verify device
IDs before proceeding. Do not place them on tmpfs if `/etc` targets are elsewhere.

Populate `/var/lib/tg-ssh-install/input.json` (root:root0600) using the exact schema
below. Obtain target ID/name by narrowly inspecting the operator's known current
container, not from a broad fleet scan. Store complete original Docker inspection
privately; this is not a public fixture or inventory file.

```json
{
  "schema": 1,
  "repository": "/usr/local/src/tactics-guru-v2",
  "package": "/usr/local/src/tactics-guru-v2/deploy",
  "public_key": "/var/lib/tg-ssh-install/deploy-ed25519.pub",
  "container_id": "<actual-64-lowercase-hex-running-container-ID>",
  "container_name": "<actual-current-container-name>",
  "backup_name": "<new-distinct-absent-backup-container-name>",
  "contexts": [
    {"host":"localhost","addr":"127.0.0.1","laddr":"127.0.0.1","lport":"22"},
    {"host":"<actual-client-host-token>","addr":"<actual-client-IP>","laddr":"2.24.125.17","lport":"22"}
  ],
  "maintenance": "/var/lib/tg-ssh-install/maintenance.json"
}
```

Replace every placeholder. `host/addr/laddr/lport` are strings; include actual
loopback acceptance and all relevant external connection contexts (1–32). SSH
Include/PAM inventories are recursive and bounded; testing one guessed context
does not establish policy for every client. No extra input fields are accepted.

After exclusion really holds, create the short lease immediately before prepare:

```sh
/usr/bin/python3 -I -B -c 'import json,os,time; from pathlib import Path; p=Path("/var/lib/tg-ssh-install/maintenance.json"); now=time.time(); v={"schema":1,"boot":Path("/proc/sys/kernel/random/boot_id").read_text().strip(),"created":now,"expires":now+300,"exclusive_native_writers":True,"exclusive_deploy_writers":True,"legacy_admission_excluded":True}; fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600); os.write(fd,json.dumps(v,sort_keys=True,separators=(",",":")).encode()); os.fsync(fd); os.close(fd); fd=os.open(p.parent,os.O_DIRECTORY); os.fsync(fd); os.close(fd)'
```

Lease and forward plan lifetime are at most300 seconds; each operation also has a
90-second lifecycle deadline. Do not start unless prepare/check/apply/verify and
activation can finish in that window. Source/input/public-key identities, mtimes,
inodes, exact backup bytes and all baseline categories are bound. Replacing the
lease or input after prepare changes forward approval invariants. Expired
activation is blocked: do not rewrite plan dates or mint a substitute post-apply
baseline. Keep closed, use recovery, then a fresh coherent plan after restoration.

## 3. Prepare and check (private evidence, not host installation)

```sh
cd /usr/local/src/tactics-guru-v2
CLI=/usr/local/src/tactics-guru-v2/deploy/ssh-install/console-candidate/console_cli.py
INPUT=/var/lib/tg-ssh-install/input.json
PLAN=/var/lib/tg-ssh-install/plan.json
JOURNAL=/var/lib/tg-ssh-install/transaction
/usr/bin/python3 -I -B "$CLI" prepare --input "$INPUT" --plan "$PLAN"
/usr/bin/python3 -I -B "$CLI" check --input "$INPUT" --plan "$PLAN"
sha256sum "$PLAN"
```

Prepare writes an exclusive new0600 plan plus a separate0700 `plan.json.backups`
directory with0600 copies of all present targets, including account databases.
It does not install accounts, policy, code, or containers. These backups are
sensitive; do not paste them or the complete snapshot into Git/chat/review logs.
Check must report coherent, same plan SHA, gateCLOSED. Privately review inventory,
container configuration, artifact/current/order/marker hashes, absent targets,
PAM/NSS/SSH context coverage, source commit and expiration. An output SHA is not
independent source approval. Never reuse partially written plan/backup paths;
preserve failed capture evidence and use new private paths only after diagnosis.

## 4. Apply → verify → activate (three distinct gates)

Only after independent exact-package approval and the user's review of the
coherent private plan:

```sh
/usr/bin/python3 -I -B "$CLI" apply --input "$INPUT" --plan "$PLAN" --journal "$JOURNAL"
# Type at the authenticated console: APPLY <exact saved plan SHA256>
/usr/bin/python3 -I -B "$CLI" verify --input "$INPUT" --plan "$PLAN" --journal "$JOURNAL"
```

Apply journals intent before effects and performs native account creation,
root-controlled installed code/key/snippet, exact historical artifact bootstrap,
effective policy checks + actual `systemctl reload ssh`, fixed container data-mount
migration and full hash health checks. **Apply never enables publication**. Require
`verified-closed`, intact original backup container (stopped, renamed to the saved
backup name), unchanged original data/config/order and all artifacts healthy.
Verify rechecks fresh activation invariants, complete installed/native ownership,
other-user policies, SSH/PAM/NSS/source/backup drift and health under the fence.
Keep maintenance exclusion throughout. Privately capture commands/statuses.

```sh
# Use the actual root-owned local dedicated key, mode0600, outside the checkout.
/usr/bin/python3 -I -B "$CLI" activate --input "$INPUT" --plan "$PLAN" --journal "$JOURNAL" --acceptance-key /var/lib/tg-ssh-install/deploy-ed25519
# Type: ACTIVATE <the SAME exact saved plan SHA256>
```

Activation first verifies the live invariants and actual local SSH/PAM dedicated
key match using the authoritative host public key. Positive authentication must
reach closed publisher exit75; wrong shell/subsystem exit64, PTY and remote
forwarding must be denied. Only then is the fixed gate durably changed to
`enabled\n`. A service reload or a test that denies every key is not positive auth
proof. Catchable activation failures attempt gate closure and owned-key revocation
before releasing the publication/legacy fence, with one bounded compensation
attempt and no automatic activation retry. Confirmed compensation is journaled
`activation-failed-closed`; unconfirmed closure/revocation is `activation-uncertain`.
An expired or unreadable maintenance lease does not skip these cleanup attempts.
Compensation retains the key device/inode captured before enabling admission and
preserves a foreign replacement. Lease failure still records `activation-uncertain`,
even if the gate/key readback shows closure; reestablish exclusion before recovery.
A hard crash, lost response or unavailable journal storage is **not atomic** with
the admission change: the gate may be enabled and the journal may still say
`activating` (or retain a stale `activated` value). A failed CLI command is never
proof of closed admission or successful activation. Preserve the exact error and
journals, maintain exclusive maintenance, independently read back the gate and
key immediately from the authenticated console, and use section6 recovery. Do not
publish the key, restart CI, or retry activation after an ambiguous outcome.
Read back gate/key modes and bytes, lifecycle status `activated`, exact origin
artifact hashes, original container identity and unrelated SSH policy. The CLI
`verify` is a **preactivation** command requiring `verified-closed`; do not call it
postactivation and interpret its expected refusal as a broken installation.

## 5. Viewer isolation and subsequent CI proof (separate manual authority)

Run these manual probes from the appropriate context; **none were run against
production as part of package validation**. Supply the actual protected hostname
and independently verified Access tenant. Do not follow redirects or retain
cookies/token-bearing URLs in public evidence.

```sh
umask 077
GAME_HOST='<actual-protected-hostname>'
curl --noproxy '*' --max-time 10 -sS -D /var/lib/tg-ssh-install/access-headers -o /var/lib/tg-ssh-install/access-body "https://$GAME_HOST/"
curl --noproxy '*' --max-time 10 -sS -D /var/lib/tg-ssh-install/origin-headers -o /var/lib/tg-ssh-install/origin-body -H "Host: $GAME_HOST" http://2.24.125.17:9122/
# Host-console loopback health, distinct from the external direct-origin denial:
curl --noproxy '*' --max-time 5 -fsS http://127.0.0.1:9122/index.html
```

Anonymous public root must be a structurally valid Cloudflare Access login302,
not an arbitrary redirect/application response. Expected direct-origin403 must
be tested from outside the host (a loopback or agent-container request is not that
proof); check rejection body/no application leakage as well as status. The
existing hostname/Host/SNI direct-origin routing protections should also be
rechecked through the site's reviewed matrix. Store files privately0600 under
umask077. Do not weaken an allowlist to make a probe pass.

Only **after actual host restrictions/readbacks pass**, the user may separately
publish the named private key to GitHub using stdin, never argv or pasted output:

```sh
gh secret set TG_DEPLOY_SSH_PRIVATE_KEY --repo luminari-gurus/tactics-guru-v2 < /var/lib/tg-ssh-install/deploy-ed25519
# Read secret NAME metadata only; never request its value.
gh secret list --repo luminari-gurus/tactics-guru-v2
```

Do not run that here or infer secret usability from existence. MergePR12 requires
separate authority. The real main workflow positive publication must follow a
separately approved main release with genuine GitHub run number/attempt and SHA;
do not borrow PR metadata or fake a larger order to pass replay checks. Record
successful Actions result, matching origin `_deployment.json`, full artifact
hashes, restart proof and viewer isolation before claiming automatic deployment.
No actual main workflow publication or automatic deployment is established by
fixture results. Legacy receiver/HMAC/Cloudflare credentials remain until separately
authorized retirement **after** replacement proof; no automatic cleanup is coded.

## 6. Interrupted operation, rollback and drift

`recover` is the only whole-installation rollback entry point. It closes admission
and revokes only the exact owned key, quiesces identity-proven dedicated SSH
children, holds original lock inodes, then reverses verified owned stages using
fresh journals. Do not call apply again to resume or delete locks/journals.

```sh
/usr/bin/python3 -I -B "$CLI" recover --input "$INPUT" --plan "$PLAN" --journal "$JOURNAL"
# Type: RECOVER <exact original saved plan SHA256>
```

Recovery may use an expired forward plan, but requires unchanged source/input/key
bindings, private backups and valid explicit maintenance exclusion. If its lease
expired, first reestablish exclusion and renew **that lease only** with a bounded,
root-private same-path update; retain old lease evidence. Recovery does not create
new forward approval or authorize later activation. An operator must inspect such
renewal separately; do not edit other original evidence. Keep the exact original
checkout/binaries available. Reboot/partial native operations/foreign native
locks may remain ambiguous: stop and retain all evidence rather than invent a
successful rollback.

After recovery read back: original container ID/name/config/mount/running state
and artifact hashes/current/order; unchanged nonowned account bytes and other
users' effective SSH policy; no owned new account/home/code/root/snippet; gate
maintenance, owned new key empty. Preserve original release and backups. Recovery
is drift-aware: foreign files, conflicting inodes, changed key/container/native
state and unknown same-UID processes are preserved and may block subsequent
rollback stages. Installed code/home/snippet/key ownership binds persisted device
and inode as well as bytes/mode; an identical-byte foreign replacement is not
owned. Private file/directory staging identities are journaled before target
publication, including lost mkdir/replace responses; restored replacement inodes
are separately bound. Policy removal shares the installed-files journal rather
than unlinking by content. Old journals lacking these identities are not silently
upgraded: preserve conflicting targets and obtain manual console diagnosis.
Never delete arbitrary `/etc/.pwd.lock`, Docker objects, a lock
file, foreign key, or unknown process to force success. Use provider console and
manual diagnosis with exact IDs/journals. Partial restoration is not success.
Post-publication rollback of arbitrary release history is outside this installer;
there is no unrestricted remote rollback command. Do not repoint `current` without
the separately reviewed admin publication-lock/hash/fsync procedure.

## 7. Public package validation and evidence boundaries

Run only on an isolated development/CI host with Docker, never on production.
Actor modules are explicit container entry points, **not** ordinary discovery
modules. Offline discovery over every actor produces expected missing-fixture
imports; use the explicit suite below. Fixture keys are generated only inside
disposable containers, never exported or staged. Existing pinned local Ubuntu
and Nginx fixture images are prerequisites; their IDs are listed in
`fixture_support.py` and `run_native_candidate.py`. Publisher equipped-image
fixture is separately pinned; its run does not prove fresh package installation.

```sh
python3 -B deploy/ssh-install/test_packaging.py
(cd deploy/ssh-install/console-candidate && python3 -B -m unittest test_candidate test_inventory test_lifecycle test_activation test_review_regressions -v)
python3 -B deploy/ssh-install/console-candidate/run_native_candidate.py native-positive.log
python3 -B deploy/ssh-install/console-candidate/run_native_candidate.py native-recovery.log recovery
python3 -B deploy/ssh-install/console-candidate/run_integrated_matrix.py
python3 -B -m unittest discover -s deploy -v
python3 -B deploy/ssh-install/run_publisher_fixture.py
npm run typecheck
npm run build
npm test
git diff --check
```

The reviewed acceptance design includes52 offline executions (46 unique IDs,
40 method implementations; inherited tests repeat),36 inside-deletion hard-death
subcases,4 native positive +2 native recovery executions,44 whole-lifecycle
matrix cases including lost Docker responses, activation invariant drift and
inside-deletion recovery, and48 unique publisher tests (41 offline +7 real SSH).
Packaging adds4 portability tests. Matrix uses UUID-owned internal network and
named volumes; native/publisher fixtures use network-none. No external ports,
privileged mode, host secret mounts or socket inside actors. The trusted outside
harness operates only UUID-owned fixture resources and verifies exact-ID absence
after removal; no broad prune. Logs/receipts are ignored generated evidence, not
public installer inputs. Copy fresh receipts to restricted external evidence
storage; prior receipts are not package validation.

These automated results cannot prove authenticated host-console preflight,
actual host inventory/factory/systemd reload, exclusive writer exclusion, native
foreign-lock reconciliation, production key prerequisites, live Access/origin
protection or main workflow success. Final exact-package review, commit/push,
CI, user review/manual installation, merge and live proof remain distinct gates.
