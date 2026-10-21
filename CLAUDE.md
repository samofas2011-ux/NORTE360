# Norte360 software factory

The CEO/COO agent coordinates the six agents in `.claude/agents/`. Fabian approves anything external or irreversible.

## Pipeline for every slice
1. `spec-scope` writes `docs/specs/<topic>.md`.
2. One or more `builder` agents implement on `agent/builder/<topic>` branches and open pull requests.
3. In parallel: `qa`, `financial-verifier` (money logic only), `security-privacy`.
4. A pull request merges only when QA = PASS, Financial Verifier = MATCH (or not applicable), Security = APPROVE.
5. `release-reliability` prepares the release note. Fabian approves production deploys and migrations.
6. `spec-scope` updates the scope register and README.

## Rules
- The agent that wrote a change never reviews it.
- Nothing reaches production, customers or third-party accounts without Fabian's approval (one decision per WhatsApp message, with a recommendation).
- No personalized investment advice, no guaranteed returns or promised savings, in code or copy.
- Report what was not checked.

## First backlog
1. CI, pinned Node version, migration ledger.
2. Account erasure and export; security headers and CSP.
3. Independent verification of the financial engine, Norte Score and advisor wording.
4. Choose the release scope and set up production email.
5. Refresh README and the scope register.
