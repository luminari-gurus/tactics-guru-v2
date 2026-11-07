import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function workflowFixture(text) {
  const yaml = text.replaceAll('\r\n', '\n');
  const script = yaml.split('          script: |\n')[1].split('\n').map(l => l.slice(12)).join('\n');
  return {yaml, script};
}
const {yaml, script} = workflowFixture(readFileSync(new URL('../../.github/workflows/auto-merge-low-risk.yml', import.meta.url), 'utf8'));
const execute = new (Object.getPrototypeOf(async function () {}).constructor)('github', 'context', 'core', script);
const A = 'a'.repeat(40), B = 'b'.repeat(40), C = 'c'.repeat(40);
const repository = 'luminari-gurus/tactics-guru-v2';
const body = (sha = A, level = 'low') => `<!-- tactics-guru-pr-risk -->\n<!-- tactics-guru-pr-risk:v1 head=${sha} level=${level} -->\nRisk: ${level}\nEvidence: tests passed.\n`;
test('workflow fixture extracts identical gate code from LF and CRLF', () => {
  assert.deepEqual(workflowFixture(yaml), workflowFixture(yaml.replaceAll('\n', '\r\n')));
});
function fixture() {
  const s = {
    pr: {number: 7, base: {ref: 'main'}, state: 'open', merged: false, draft: false, head: {sha: A, repo: {full_name: repository}}, user: {login: 'author'}, labels: [{name: 'risk:low'}, {name: 'bug'}]},
    comments: [{id: 9, node_id: 'COMMENT_9', user: {login: 'assessor'}, updated_at: '2026-11-05T12:00:00Z', body: body()}],
    events: [{id: 10, event: 'labeled', label: {name: 'risk:low'}, actor: {login: 'labeler'}}],
    roles: {author: 'maintain', assessor: 'admin', labeler: 'maintain'},
    runs: [{id: 11, head_sha: A, event: 'pull_request', status: 'completed', conclusion: 'success', run_number: 1, run_attempt: 1, pull_requests: [{number: 7, base: {ref: 'main'}}]}],
    jobs: [{name: 'verify', status: 'completed', conclusion: 'success'}], reviews: [],
    merges: [], calls: [], hooks: {}, editor: null, lastEditedAt: null,
    context: {eventName: 'pull_request_target', repo: {owner: 'luminari-gurus', repo: 'tactics-guru-v2'}, payload: {action: 'labeled', pull_request: {number: 7}}}
  };
  const api = (name, fn) => async args => {
    s.calls.push({name, args});
    await s.hooks[name]?.(args, s.calls.filter(c => c.name === name).length);
    return {data: structuredClone(await fn(args))};
  };
  const github = {rest: {
    repos: {
      getCollaboratorPermissionLevel: api('permission', a => ({role_name: s.roles[a.username] ?? 'read'})),
      listPullRequestsAssociatedWithCommit: api('associated', () => [s.pr])
    },
    pulls: {
      get: api('pr', () => s.pr), listReviews: api('reviews', () => s.reviews),
      merge: api('merge', a => {
        if (a.sha !== s.pr.head.sha) throw Object.assign(new Error('Head changed'), {status: 409});
        s.merges.push(a); return {merged: true};
      })
    },
    issues: {
      getLabel: api('getLabel', () => ({name: 'risk:pending'})), createLabel: api('createLabel', () => ({name: 'risk:pending'})),
      listComments: api('comments', () => s.comments), listEvents: api('events', () => s.events),
      addLabels: api('add', a => { for (const name of a.labels) if (!s.pr.labels.some(l => l.name === name)) s.pr.labels.push({name}); return s.pr.labels; }),
      removeLabel: api('remove', a => { s.pr.labels = s.pr.labels.filter(l => l.name !== a.name); return s.pr.labels; })
    },
    actions: {
      listWorkflowRuns: api('runs', a => {assert.equal(a.workflow_id, 'pr-verification.yml'); assert.equal(a.event, 'pull_request'); return s.runs;}),
      listJobsForWorkflowRun: api('jobs', a => {assert.equal(a.filter, 'latest'); return s.jobs;})
    }
  }, graphql: async (_query, args) => {
    const c = s.comments.find(c => c.node_id === args.id);
    return {node: c ? {body: c.body, author: c.user, editor: s.editor ? {login: s.editor} : null, lastEditedAt: s.lastEditedAt, updatedAt: c.updated_at} : null};
  }, paginate: async (method, args) => {assert.equal(args.per_page, 100); return (await method(args)).data;}};
  s.go = () => execute(github, s.context, {info() {}});
  s.sync = () => {s.context.payload.action = 'synchronize';};
  s.workflow = () => {s.context.eventName = 'workflow_run'; s.context.payload = {workflow_run: {head_sha: s.pr.head.sha, event: 'pull_request'}};};
  s.comment = () => {s.context.eventName = 'issue_comment'; s.context.payload = {action: 'edited', issue: {number: 7, pull_request: {}}};};
  return s;
}

test('trusted exact-head low assessment and successful verify merge with a SHA precondition', async () => {
  const s = fixture(); await s.go(); assert.equal(s.merges.length, 1); assert.equal(s.merges[0].sha, A); assert.equal(s.merges[0].merge_method, 'merge');
});
for (const [name, change] of [
  ['draft', s => s.pr.draft = true], ['closed', s => s.pr.state = 'closed'], ['merged', s => s.pr.merged = true],
  ['fork', s => s.pr.head.repo.full_name = 'outsider/fork'], ['deleted fork', s => s.pr.head.repo = null],
  ['missing low label', s => s.pr.labels = []], ['contradictory high label', s => s.pr.labels.push({name: 'risk:high'})],
  ['pending label', s => s.pr.labels.push({name: 'risk:pending'})], ['unknown risk label', s => s.pr.labels.push({name: 'risk:unknown'})],
  ['untrusted author', s => s.roles.author = 'write'], ['untrusted labeler', s => s.roles.labeler = 'write'],
  ['missing label provenance', s => s.events = []], ['untrusted assessment author', s => s.roles.assessor = 'write'],
  ['absent assessment', s => s.comments = []], ['duplicate trusted assessment', s => s.comments.push({...s.comments[0], id: 12})],
  ['legacy comment', s => s.comments[0].body = '<!-- tactics-guru-pr-risk -->\nRisk low; head ' + A],
  ['stale head', s => s.comments[0].body = body(B)], ['non-low assessment', s => s.comments[0].body = body(A, 'medium')],
  ['embedded forged marker', s => s.comments[0].body = 'quoted\n' + body()], ['duplicate metadata', s => s.comments[0].body += body()],
  ['untrusted comment editor', s => {s.editor = 'outsider'; s.lastEditedAt = '2026-11-05';}],
  ['unknown comment editor', s => s.lastEditedAt = '2026-11-05'],
  ['wrong base CI', s => s.runs[0].pull_requests[0].base.ref = 'other'],
  ['wrong PR CI', s => s.runs[0].pull_requests = [{number: 8}]],
  ['missing CI', s => s.runs = []], ['old head CI', s => s.runs[0].head_sha = B],
  ['wrong CI event', s => s.runs[0].event = 'workflow_dispatch'], ['running CI', s => s.runs[0].status = 'in_progress'],
  ['failed CI workflow', s => s.runs[0].conclusion = 'failure'], ['missing verify job', s => s.jobs = []],
  ['skipped verify', s => s.jobs[0].conclusion = 'skipped'], ['failed verify', s => s.jobs[0].conclusion = 'failure'],
  ['pending verify', s => s.jobs[0].status = 'queued'], ['ambiguous verify', s => s.jobs.push({...s.jobs[0]})],
  ['changes requested', s => s.reviews = [{id: 1, user: {login: 'reviewer'}, state: 'CHANGES_REQUESTED'}]],
  ['latest failed rerun', s => s.runs.push({...s.runs[0], run_attempt: 2, conclusion: 'failure'})],
  ['latest new run pending', s => s.runs.push({...s.runs[0], id: 12, run_number: 2, status: 'queued', conclusion: null})]
]) test(`fails closed: ${name}`, async () => {const s = fixture(); change(s); await s.go(); assert.equal(s.merges.length, 0);});

test('untrusted forged comment cannot override trusted current assessment', async () => {
  const s = fixture(); s.comments.push({id: 22, user: {login: 'outsider'}, body: body(B)}); await s.go(); assert.equal(s.merges.length, 1);
});
test('latest label actor across pages is authoritative', async () => {
  const s = fixture(); s.events.push({id: 200, event: 'labeled', label: {name: 'risk:low'}, actor: {login: 'outsider'}}); await s.go(); assert.equal(s.merges.length, 0);
});
test('reviews are reduced globally, not page-by-page; later approval clears request', async () => {
  const s = fixture(); s.reviews = [{id: 2, user: {login: 'r'}, state: 'APPROVED'}, {id: 1, user: {login: 'r'}, state: 'CHANGES_REQUESTED'}, {id: 3, user: {login: 'r'}, state: 'COMMENTED'}]; await s.go(); assert.equal(s.merges.length, 1);
});
test('synchronize adds an eligibility barrier without deleting level provenance or unrelated labels', async () => {
  const s = fixture(); s.sync(); s.pr.head.sha = B; s.pr.labels.push({name: 'risk:high'}); await s.go(); assert.deepEqual(s.pr.labels.map(l => l.name).sort(), ['bug', 'risk:high', 'risk:low', 'risk:pending']); assert.equal(s.merges.length, 0);
});
test('rapid pushes and out-of-order sync use current head, not payload', async () => {
  const s = fixture(); s.sync(); s.context.payload.pull_request.head = {sha: B}; s.pr.head.sha = C; await s.go(); assert.equal(s.merges.length, 0); assert.ok(s.pr.labels.some(l => l.name === 'risk:pending'));
  s.comments[0].body = body(B); s.comment(); await s.go(); assert.equal(s.merges.length, 0);
});
test('late sync does not invalidate newer current-head assessment', async () => {
  const s = fixture(); s.sync(); s.context.payload.pull_request.head = {sha: B}; await s.go(); assert.equal(s.merges.length, 1); assert.equal(s.calls.filter(c => c.name === 'add').length, 0);
});
test('draft conversion invalidates even a current assessment', async () => {
  const s = fixture(); s.pr.draft = true; s.context.payload.action = 'converted_to_draft'; await s.go(); assert.equal(s.merges.length, 0); assert.ok(s.pr.labels.some(l => l.name === 'risk:pending'));
});
test('CI-before-assessment: comment event merges once evidence and labels are complete', async () => {
  const s = fixture(); s.comments = []; s.workflow(); await s.go(); assert.equal(s.merges.length, 0);
  s.comments = [fixture().comments[0]]; s.comment(); await s.go(); assert.equal(s.merges.length, 1);
});
test('assessment-before-CI: completed workflow event rechecks current evidence', async () => {
  const s = fixture(); s.runs[0].status = 'in_progress'; s.comment(); await s.go(); assert.equal(s.merges.length, 0);
  s.runs[0].status = 'completed'; s.workflow(); await s.go(); assert.equal(s.merges.length, 1);
});
test('pending removal re-evaluates even when low label already existed', async () => {
  const s = fixture(); s.pr.labels.push({name: 'risk:pending'}); s.comment(); await s.go(); assert.equal(s.merges.length, 0);
  s.pr.labels = s.pr.labels.filter(l => l.name !== 'risk:pending'); s.context.eventName = 'pull_request_target'; s.context.payload = {action: 'unlabeled', pull_request: {number: 7}}; await s.go(); assert.equal(s.merges.length, 1);
});
for (const [name, hook, change] of [
  ['base change', 'pr', s => s.pr.base.ref = 'other'],
  ['head push', 'pr', s => s.pr.head.sha = B], ['draft conversion', 'pr', s => s.pr.draft = true],
  ['new conflicting label', 'pr', s => s.pr.labels.push({name: 'risk:high'})],
  ['stale result overwrite', 'comments', s => s.comments[0].body = body(B)],
  ['changed assessment', 'comments', s => s.comments[0].body = body(A, 'high')],
  ['new labeler', 'events', s => s.events.push({id: 999, event: 'labeled', label: {name: 'risk:low'}, actor: {login: 'outsider'}})],
  ['CI rerun', 'runs', s => s.runs[0].status = 'in_progress'],
  ['new requested changes', 'reviews', s => s.reviews.push({id: 999, user: {login: 'r'}, state: 'CHANGES_REQUESTED'})]
]) test(`final recheck blocks ${name}`, async () => {const s = fixture(); s.hooks[hook] = (_, n) => {if (n === 2) change(s);}; await s.go(); assert.equal(s.merges.length, 0);});
test('push after final read is rejected atomically by merge SHA', async () => {
  const s = fixture(); s.hooks.merge = () => s.pr.head.sha = B; await assert.rejects(s.go(), /Head changed/); assert.equal(s.merges.length, 0);
});
test('unexpected API error fails closed', async () => {
  const s = fixture(); s.hooks.permission = () => {throw Object.assign(new Error('rate limit'), {status: 403});}; await assert.rejects(s.go(), /rate limit/); assert.equal(s.merges.length, 0);
});
test('workflow never executes untrusted code and all event families share a lock', () => {
  assert.doesNotMatch(yaml, /actions\/checkout|eval\(|child_process|spawn\(/);
  assert.match(yaml, /types: \[opened, reopened, synchronize, ready_for_review, converted_to_draft, labeled, unlabeled\]/);
  assert.match(yaml, /issue_comment:\n    types: \[created, edited, deleted\]/);
  assert.match(yaml, /group: auto-merge-low-risk-\$\{\{ github.repository \}\}/);
  assert.match(yaml, /cancel-in-progress: false/);
});

test('queue retains pending events across PRs', () => {assert.match(yaml, /queue: max/);});

test('draft-only PR is ignored without labels or comments', async () => {const s = fixture(); s.pr.draft = true; s.pr.labels = [{name: 'bug'}]; s.comments = []; s.context.payload.action = 'opened'; await s.go(); assert.equal(s.calls.some(c => ['add', 'remove', 'merge'].includes(c.name)), false);});

test('creates pending label when absent', async () => {const s = fixture(); s.sync(); s.pr.head.sha = B; s.hooks.getLabel = (_, n) => {if (n === 1) throw Object.assign(new Error('missing'), {status: 404});}; await s.go(); assert.equal(s.calls.filter(c => c.name === 'createLabel').length, 1); assert.equal(s.merges.length, 0);});

// Simulates the external assessor's ordered publication, including its final read.
function racingAssessment(level = 'low') {
  const s = fixture();
  s.sync(); s.pr.head.sha = B; s.runs[0].head_sha = B;
  s.publish = () => {
    s.comments[0].body = body(B, level);
    s.comments[0].updated_at = '2026-11-05T13:00:00Z';
    s.pr.labels = [{name: `risk:${level}`}, {name: 'bug'}];
    s.events.push({id: 20, event: 'labeled', label: {name: `risk:${level}`}, actor: {login: 'assessor'}});
    assert.equal(s.pr.head.sha, B);
    assert.deepEqual(s.pr.labels.map(l => l.name), [`risk:${level}`, 'bug']);
  };
  return s;
}
for (const [timing, hook, count] of [
  ['during freshRecord read', 'comments', 2],
  ['between freshRecord and addLabels', 'add', 1],
  ['after addLabels', 'comments', 3]
]) test(`recovers assessor completion ${timing} without another event`, async () => {
  const s = racingAssessment();
  s.hooks[hook] = (_, n) => {if (n === count) s.publish();};
  await s.go();
  assert.deepEqual(s.pr.labels.map(l => l.name).sort(), ['bug', 'risk:low']);
  assert.equal(s.events.at(-1).actor.login, 'assessor');
  assert.equal(s.calls.some(c => c.name === 'remove' && c.args.name !== 'risk:pending'), false);
  assert.equal(s.calls.some(c => c.name === 'add' && c.args.labels.some(l => l !== 'risk:pending')), false);
  assert.equal(s.merges.length, 1); assert.equal(s.merges[0].sha, B);
});
for (const level of ['medium', 'high', 'critical']) test(`recovers completed ${level} assessment without merging`, async () => {
  const s = racingAssessment(level); s.hooks.add = () => s.publish();
  await s.go(); assert.deepEqual(s.pr.labels.map(l => l.name).sort(), ['bug', `risk:${level}`]); assert.equal(s.merges.length, 0);
});
for (const [name, change] of [
  ['new head', s => s.pr.head.sha = C],
  ['draft', s => s.pr.draft = true],
  ['closed', s => s.pr.state = 'closed'],
  ['fork', s => s.pr.head.repo.full_name = 'outsider/fork'],
  ['base', s => s.pr.base.ref = 'other'],
  ['stale assessment', s => s.comments[0].body = body(A)],
  ['changed level', s => s.comments[0].body = body(B, 'high')],
  ['untrusted editor', s => {s.editor = 'outsider'; s.lastEditedAt = 'now';}],
  ['untrusted creator', s => s.roles.assessor = 'write'],
  ['missing label', s => s.pr.labels = [{name: 'risk:pending'}]],
  ['conflicting level', s => s.pr.labels.push({name: 'risk:high'})],
  ['unknown label', s => s.pr.labels.push({name: 'risk:unknown'})],
  ['untrusted actor', s => s.events.push({id: 30, event: 'labeled', label: {name: 'risk:low'}, actor: {login: 'outsider'}})],
  ['missing provenance', s => s.events = []]
]) test(`recovery fails closed on ${name}`, async () => {
  const s = racingAssessment(); s.hooks.add = () => s.publish();
  s.hooks.comments = (_, n) => {if (n === 3) change(s);};
  await s.go(); assert.equal(s.merges.length, 0); assert.ok(s.pr.labels.some(l => l.name === 'risk:pending'));
});
for (const [name, hook, count, change] of [
  ['head', 'pr', 4, s => s.pr.head.sha = C],
  ['assessment', 'comments', 4, s => s.comments[0].body = body(B, 'high')],
  ['label actor', 'events', 2, s => s.events.push({id: 30, event: 'labeled', label: {name: 'risk:low'}, actor: {login: 'outsider'}})],
  ['label conflict', 'pr', 4, s => s.pr.labels.push({name: 'risk:high'})]
]) test(`recovery recheck rejects changed ${name}`, async () => {
  const s = racingAssessment(); s.hooks.add = () => s.publish();
  s.hooks[hook] = (_, n) => {if (n === count) change(s);};
  await s.go(); assert.equal(s.merges.length, 0); assert.ok(s.pr.labels.some(l => l.name === 'risk:pending'));
});
test('push during pending removal cannot merge the old or unassessed head', async () => {
  const s = racingAssessment(); s.hooks.add = () => s.publish(); s.hooks.remove = () => s.pr.head.sha = C;
  await s.go(); assert.equal(s.merges.length, 0);
});
test('late assessor finishes after recovery read and clears pending itself', async () => {
  const s = racingAssessment(); s.hooks.pr = (_, n) => {if (n === 3) s.publish();};
  await s.go(); assert.equal(s.merges.length, 0); assert.equal(s.pr.labels.some(l => l.name === 'risk:pending'), false);
  s.hooks = {}; s.comment(); await s.go(); assert.equal(s.merges.length, 1);
});
test('pending recovery does not bypass failed verification', async () => {
  const s = racingAssessment(); s.hooks.add = () => s.publish(); s.runs[0].conclusion = 'failure';
  await s.go(); assert.equal(s.pr.labels.some(l => l.name === 'risk:pending'), false); assert.equal(s.merges.length, 0);
});
test('pending recovery API failure fails closed', async () => {
  const s = racingAssessment(); s.hooks.add = () => s.publish();
  s.hooks.remove = () => {throw new Error('rate limit');};
  await assert.rejects(s.go(), /rate limit/); assert.equal(s.merges.length, 0); assert.ok(s.pr.labels.some(l => l.name === 'risk:pending'));
});


test('completion during refresh re-reads labels cleared after the PR snapshot', async () => {
  const s = racingAssessment(); s.pr.labels.push({name: 'risk:pending'});
  s.hooks.comments = (_, n) => {if (n === 2) s.publish();};
  await s.go(); assert.equal(s.pr.labels.some(l => l.name === 'risk:pending'), false); assert.equal(s.merges.length, 1);
});
