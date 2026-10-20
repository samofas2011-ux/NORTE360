# NORTE360 Functionality Audit

Date: 2026-09-06

The product is not feature-complete or ready for public launch. The local working tree contains substantially more functionality than the currently deployed production build. Passing tests below do not imply that every roadmap feature exists or that the financial models have been independently validated.

## Implemented Database Flows

| Feature | Read | Create/Update | Delete | Scope |
| --- | --- | --- | --- | --- |
| Account access | Session lookup | Registration and login | Session revocation/logout | Individual account |
| Financial profile | Saved income, expenses, planning assumptions | Save profile without duplicating asset/debt totals | No profile/account erasure UI yet | Individual account |
| Assets and liabilities | Individual records and aggregate totals | Create and edit records | Soft delete | Individual account |
| Goals | Saved targets, progress, date | Save/update one goal per type | Soft delete | Individual account |
| Routes | Recent saved comparisons | Generate four debt-payment variants | Delete saved scenarios and linked calculations | Individual account |
| Mortgage simulation | Saved inputs/results | Calculate and save; reload and recalculate | Delete simulation and linked calculation | Individual account |
| Other decisions | Saved inputs/results | Car purchase, consolidation, investment/debt comparison, net salary change, windfall distribution | Delete simulation and linked calculation | Individual account |
| Household | Accepted members' aggregate totals | Create, rename, invite registered accounts, accept invitations | Remove membership or archive household | Owner checks and acceptance before sharing |
| Advisor | Recent conversation history | Store question and deterministic analysis of saved profile | Clear conversation | Individual account |
| Notifications | Recent saved notices | Generated on profile saves; mark read | Delete | Individual account |
| Resources | Published resources with content/URL | Curated SQL seed; no end-user publishing | No end-user deletion | Shared educational catalog |

API handlers authenticate the account and reject cross-origin mutation requests. The launch gate is separate from account authentication. Product APIs use parameterized queries and ownership filters. Invalid values receive validation errors; database failures receive a generic error without returning SQL or credentials.

## Remaining Work

- Financial accounts, balance snapshots, transaction history, imported data sources, and consent management have schema definitions but no complete product workflows or APIs.
- Account verification, password recovery, account/profile erasure and export, and full lifecycle settings are not implemented.
- Routes use a weighted aggregate debt rate and extra-payment multipliers. They do not optimize a portfolio of individual debts, incorporate income uncertainty, or project all goal categories. The labels must not be interpreted as proven optimal strategies.
- The advisor is a deterministic template, not a connected language-model service or unrestricted conversational financial advisor.
- Goal progress is entered manually. There is one goal per type, not a general multiple-goal allocation engine.
- Simulation histories are limited to recent records. Full history pagination and retention controls remain to be implemented.
- Mortgage estimates exclude insurance and closing expenses. Investment/debt comparisons use declared simplified assumptions. Windfall distribution does not calculate Costa Rican statutory aguinaldo or payroll taxes.
- Household invitations require an existing registered account and appear inside the app. No email invitations are sent. Shared goal editing and granular household permissions remain incomplete.
- Educational resources are verified external links. There is no content-management or learning-progress workflow.
- Norte Score is an internal heuristic, not an independently validated financial score.
- Intermittent database/network stalls were observed. Requests have timeouts, but production reliability and load behavior still need measurement.

## Verification

- `npm test`: 12 unit tests passed, covering financial calculations, decision scenarios, and gate-token validation.
- `npm run build`: production compilation and TypeScript checks passed.
- `node scripts/verify-product.mjs`: 73 HTTP checks passed in the final rerun. The workflow uses disposable accounts against the configured database, with cleanup in `finally`. Checks cover persistence, validation, cross-account write/delete isolation, family invitation acceptance, all implemented simulator types, deletion, gate protection, and logout.
- Browser checks in the preceding work exercised private-gate login, account login, saving decimal income/expense amounts, and creation of an asset that updated the dashboard totals. A complete desktop/mobile visual regression suite has not been run.
- Production checks on `https://tunorte360.com`: `/`, `/app`, `/login`, `/create-account`, `/api/financial-profile`, and `/api/app-data` returned redirects to the private landing page. `/robots.txt` disallowed all crawling.
- This audit did not deploy or expose the new working-tree functionality. Production still serves the earlier protected build.

## Database Changes Applied

`sql/product-runtime-migration.sql` adds `financial_profiles.planning_json`, separating planning assumptions from goal records. `sql/resources.sql` inserts three curated educational links. Neither migration removes existing user data.

Resource sources: [FTC budgeting guide](https://consumidor.gov/su-dinero/como-hacer-un-presupuesto), [CFPB emergency fund guide](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/), [CFPB debt strategies](https://www.consumerfinance.gov/archive/blog/how-reduce-your-debt/).
