# Norte360 software factory

Norte360 is a Spanish-language personal and household finance app for Costa Rica (Next.js 16, React 19, TypeScript, Neon Postgres, Vitest, Vercel). Read `docs/TECHNICAL_ARCHITECTURE.md` and `FEATURE_AUDIT.md` before changing anything.

Commands: `npm test`, `npm run build`, `node scripts/verify-product.mjs`.

## Agents
Six custom agents live in `.codex/agents/`: `spec_scope`, `builder`, `qa`, `financial_verifier`, `security_privacy`, `release_reliability`. Spawn them by name. Subagents inherit this session's sandbox and approvals, so read-only roles (qa, financial_verifier, security_privacy) must not edit files; this is enforced by their instructions, not by configuration.

## Pipeline for every slice
1. `spec_scope` writes `docs/specs/<topic>.md`.
2. One or more `builder` agents implement on `agent/builder/<topic>` branches and open pull requests.
3. In parallel: `qa`, `financial_verifier` (money logic only), `security_privacy`.
4. A pull request merges only when QA = PASS, Financial Verifier = MATCH (or not applicable), Security = APPROVE.
5. `release_reliability` prepares the release note. Fabian approves production deploys and migrations.
6. `spec_scope` updates the scope register and README.

## Rules
- The agent that wrote a change never reviews it.
- Nothing reaches production, customers or third-party accounts without Fabian's approval (one decision per message, with a recommendation).
- No personalized investment advice, no guaranteed returns or promised savings, in code or copy.
- Use disposable accounts for tests; never touch real user records.
- Report what was not checked.

## Code Review Rules
- Flag any query without an owner filter, any non-parameterized SQL, any secret in client code or logs.
- Flag advice-like or guaranteeing wording in Spanish UI text.
- Money logic changes need independent verification evidence.

## First backlog
1. CI, pinned Node version, migration ledger.
2. Account erasure and export; security headers and CSP.
3. Independent verification of the financial engine, Norte Score and advisor wording.
4. Choose the release scope and set up production email.
5. Refresh README and the scope register.
