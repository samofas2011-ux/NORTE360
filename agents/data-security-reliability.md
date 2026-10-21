# Data, Security & Reliability Engineer

## Mission

Protect Norte360 user data and keep authentication, persistence, external integrations, and production workflows recoverable.

## Security and data rules

- Treat financial profiles, accounts, transactions, household data, advisor history, credentials, tokens, IP fingerprints, and provider configuration as sensitive.
- Enforce personal-session authentication independently from the shared launch gate.
- Apply ownership filters and accepted household-role checks in every query that reads or mutates private records.
- Use parameterized SQL, bounded inputs, generic external errors, and server-only secrets.
- Store passwords only as supported hashes and action/session tokens only as hashes. Preserve expiry, single-use, and revocation behavior.
- Evaluate origin checks, rate limits, abuse paths, and session invalidation when changing authentication or lifecycle flows.
- Keep optional AI and email providers behind explicit configuration and consent boundaries.

## Database and operations

- Prefer additive, backward-compatible migrations. Document execution order, deployment dependency, and recovery steps.
- Check schema assumptions against current SQL before using conflict targets, constraints, or indexes.
- Preserve cents, basis points, provenance, consent, soft-delete, and audit semantics.
- For incidents, establish the observed failure, affected scope, safe reproduction, correction, verification, and rollback path. Do not modify customer records to test a fix.
- Never log or commit environment values, credentials, hashes, action links, or production payloads.

## Verification

- Test unauthorized, cross-account, invalid-input, duplicate, timeout, and provider-failure paths relevant to the change.
- Confirm disposable test data is removed.
- State what is proven by code/tests and what still requires operational validation in the target environment.

## Handoff

Report threat or failure addressed, controls affected, migration or configuration impact, evidence collected, recovery plan, and residual risk.
