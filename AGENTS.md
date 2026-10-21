# Norte360 Repository Instructions

Norte360 is a Spanish-language financial planning product for individuals and households, initially focused on Costa Rica. The Product Owner defines outcomes and priorities. Agents own discovery, implementation, validation, documentation, and release preparation within the requested scope.

## Product principles

- Preserve the product promise: help people understand their position, compare financial paths, and act with clarity.
- Use plain Spanish in customer-facing UI. Do not present estimates as guarantees, investment advice, credit scores, or lending approvals.
- Keep the executive visual system consistent: warm paper backgrounds, deep forest green, muted blue, restrained gold, serif display headings, clean sans-serif body text, architectural geometry, and limited decoration.
- Protect user trust. Financial data, credentials, tokens, and personal information must remain server-side or in the authenticated user scope.

## How to work

1. Translate the Product Owner's direction into a concrete outcome and acceptance criteria. Resolve routine implementation choices independently.
2. Inspect only the code and documentation relevant to the task. Use `docs/TECHNICAL_ARCHITECTURE.md` for architectural or security boundaries and `FEATURE_AUDIT.md` when assessing product readiness or gaps.
3. Preserve existing behavior unless the requested outcome requires changing it. Reuse current APIs and domain modules before adding parallel implementations.
4. For substantial work, the Product Orchestrator may delegate independent, bounded subtasks to the specialists in `agents/`. Keep dependent edits coordinated and avoid multiple agents editing the same file concurrently.
5. Complete the implementation, then run the smallest meaningful validation. Every release candidate must pass `npm test` and `npm run build`.
6. Report the outcome, changed behavior, validation evidence, material risks, and any remaining product decision.

## Specialist routing

Load only the role needed for the task:

- Product scope, acceptance criteria, sequencing, or cross-domain coordination: `agents/product-orchestrator.md`
- React, Next.js, APIs, domain logic, or general implementation: `agents/full-stack-engineer.md`
- Interface, responsive behavior, accessibility, visual consistency, or copy: `agents/ux-design-engineer.md`
- Authentication, database, privacy, migrations, incidents, or reliability: `agents/data-security-reliability.md`
- Regression testing, release evidence, deployment readiness, or production verification: `agents/qa-release-manager.md`

Use multiple specialists only when their work is independently useful. The coordinating agent remains responsible for integrating and validating the final result.

## Engineering boundaries

- Keep the modular-monolith architecture: Next.js App Router, React, TypeScript, same-origin route handlers, PostgreSQL on Neon, and Vercel deployment.
- Represent money as integer cents and rates as basis points across persistence and calculation contracts.
- Authenticate every personal product API and enforce ownership or accepted household permissions in queries.
- Use parameterized SQL. Never expose raw database errors, secrets, hashes, provider tokens, or action tokens.
- Preserve the distinction between the shared private launch gate and personal account authentication.
- Schema changes require additive SQL where practical, a compatibility assessment, and a rollback or recovery note.
- Keep deterministic calculations separate from optional AI explanations. AI output must not become the source of financial truth.
- Do not add a dependency when the platform or existing code can solve the problem clearly.

## Validation and release

- Unit-test financial calculations, validation, authorization, and regressions that could affect stored data or user access.
- For changed workflows, verify the complete user path and failure state, not only the happy-path component render.
- Never use production customer data for tests. Use disposable accounts and clean them up.
- Treat `npm test` and `npm run build` as the minimum release gate. Run the relevant verification script when the changed area has one.
- A request to implement work authorizes code changes and local validation. Pushes, pull requests, database migrations, secret changes, and production deployments require explicit Product Owner direction for that action.
- Keep the private launch gate active until the Product Owner explicitly approves public launch.

## Definition of done

Work is complete when the requested behavior exists, relevant error states are handled, meaningful checks pass, documentation reflects material operational changes, and the result is ready for Product Owner review or the explicitly authorized release action.
