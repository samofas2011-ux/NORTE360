# Panorama save incident - 14 September 2026

## Confirmed production failure

The user tested tunorte360.com. Vercel production logs show PUT /api/financial-profile returning HTTP 500 with PostgreSQL 42P10: no unique or exclusion constraint matching ON CONFLICT.

The older save implementation in HEAD upserts a goal using ON CONFLICT(user_id, goal_type). The multiple-goal migration removed that unique index. A read-only EXPLAIN against the configured database reproduces 42P10 without writing a record. The old client has no catch around the save request, leaving its saving state unchanged on failure. Production /api/app-data returns 404, confirming that current local workflows are not deployed.

## Local correction

The existing newer product-db save stores planning assumptions in financial_profiles.planning_json and no longer invokes the obsolete goal upsert. This turn adds bounded client requests (45 seconds including response body), explicit API/invalid-response errors, and no automatic mutation retries. Panorama now handles save failures locally and distinguishes an acknowledged save from a subsequent panel-refresh failure. Main actions, ledger, simulations and panels using requestJson share the bounded request layer.

## Validation

- 26 unit tests passed, including stalled headers/body, invalid JSON, session errors and no duplicate mutation retries.
- Production build passed; TypeScript checked again after formatting cleanup.
- 71 localhost HTTP assertions passed with disposable accounts: profile persistence, assets/debts, goals, scenarios, simulations, family, deletion, isolation and logout. This run seeded test identities directly; it does not test registration or real email delivery.
- The verification harness cleanup initially used an already expired database signal. Cleanup was rerun with fresh clients; both disposable accounts and their associated records were removed.
- No user records were modified and no production deployment was performed.

## Deployment dependency

Production lacks the email configuration required by the newer registration flow. Promoting the whole local workspace would enable the new workflows but block new registration until email is configured. The workspace also contains substantial previously uncommitted product changes. Choose a reviewed release scope before production promotion; preserve the private launch gate. A narrow patch to the older release would fix saving but would not supply the missing product workflows.

## Targeted production patch

The owner selected the narrow patch. An isolated worktree at /Users/fabians/Documents/NORTE360-panorama-hotfix, branch codex/panorama-hotfix, commit a153521, contains only three changed files on top of f563226. It keeps the old registration and private gate. The legacy goal upsert now selects the existing goal ID and conflicts on the primary key; a per-user transactional advisory lock serializes simultaneous saves. The API returns a controlled error and the UI exits saving on network/response failure, including a 45-second timeout.

Local validation: 5 existing unit tests and production build passed. Disposable-user integration verified first save, concurrent saves, update/readback and no duplicate goals; cleanup succeeded. No existing customer records or schema changes were needed. Production deployment requested: dpl_8RCy6V2i5WRebDLFP6L69vuVnLQp. Previous deployment: dpl_59ouG8vGD1sBdxZuNcEVvN2Wthao. The complete local product release remains separate.
