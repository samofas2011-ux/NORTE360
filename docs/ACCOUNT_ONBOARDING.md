# Account Onboarding and Email Activation

## Implemented Flow

1. Register with name, email and confirmed password. The server validates and rate-limits the request. New passwords require 15 characters and at most 72 UTF-8 bytes to avoid bcrypt truncation.
2. While transactional email is not configured, registration remains available behind the private launch gate and immediately creates a personal session. These accounts are marked as not requiring email confirmation. This fallback must be removed when the sender is activated for public registration.
3. When transactional email is configured, new accounts are saved with `email_verification_required=true`. No personal session is issued during registration.
4. A confirmation email contains a random single-use link expiring in 30 minutes. Only its SHA256 hash is stored. The private launch gate still applies to the link.
5. Confirmation updates the account and atomically queues a welcome notification. The person explicitly signs in afterwards. Unconfirmed new accounts cannot sign in or use a preexisting session.
6. Users can request another confirmation email. Account-action email requests are limited per account and per requesting IP bucket.
7. Forgot-password requests return generic account-independent messages. Reset links expire after 30 minutes. A successful reset updates the password, revokes existing sessions and remaining reset tokens, and queues a password-change alert.
8. Signed-in password changes also revoke sessions and queue an alert. Existing export and account-deletion controls remain available.

Existing private-test accounts retain their previous access: the migration defaults the requirement flag to false. They can verify from account settings. Do not mark emails verified in SQL merely to bypass confirmation in production.

## Email Delivery

Cloudflare Email REST adapter, checked against the [official send API](https://developers.cloudflare.com/api/resources/email_sending/methods/send/). Templates contain Spanish HTML and plain text, explicit action links and private-access context. Tokens/passwords are never logged or included in welcome/notification queue records.

Required server environment variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_EMAIL_TOKEN` with appropriately scoped email-sending authorization
- `EMAIL_FROM` on an onboarded sending domain
- `APP_BASE_URL`, an HTTPS canonical application origin without embedded credentials

No credentials were configured or real emails sent during this task. While the site remains behind its private launch gate, missing sender configuration uses the temporary immediate-session registration fallback described above. A provider failure after creation leaves a pending account and offers a resend action; it does not claim the email was delivered. Provider acceptance/queueing does not prove arrival in the inbox.

Verification and reset links are sent directly. On delivery failure their new token row is deleted. Welcome and password-change notices are stored in `account_email_outbox` with no action tokens. Immediate delivery is attempted, and future successful login attempts retry that user's pending notices. A five-minute lease prevents routine concurrent delivery; retries stop after eight attempts. A send accepted by the provider followed by a failed database acknowledgement can produce a duplicate notice (at-least-once, not exactly-once delivery).

**Remaining operational work:** configure a scheduled queue worker and exhausted-attempt alerts before claiming unattended production delivery. The current login-triggered retry is not a complete background delivery service. Configure sender DNS authentication and validate deliverability to an owner-controlled inbox; do not test delivery to example.invalid accounts.

## Database and Verification

`sql/account-onboarding.sql` adds the per-user requirement flag and durable notification outbox. This additive migration was applied to the configured database. No existing account data was erased.

`scripts/verify-account-onboarding.mjs` uses a disposable unconfirmed account, inserts hashed test tokens, verifies confirmation/replay/expiry behavior, checks session revocation after reset and asserts queued notifications. It refuses to run when live email credentials are present and cleans up its test records. It does not prove registration-to-inbox delivery. Unit tests cover validation, email templates and mocked provider success/failure behavior.

## Before Enabling Customer Registration

- Select the sender address; onboard/verify its domain and configure the four variables in the target environment.
- Run a real registration, resend, confirmation, welcome, forgot-password and password-change journey with an inbox the owner controls.
- Exercise provider downtime, spam/bounce handling, expired links, duplicate requests and retry recovery.
- Add the scheduled delivery worker/alerts, review privacy/terms content and perform a browser/accessibility regression.
- Deploy only to the existing protected environment after approval; keep the coming-soon gate active.

OAuth/social login, MFA/passkeys, email-address changes, full session management UI, and approved legal consent pages are separate capabilities, not implied by this implementation. The older architecture handoff's account section predates these onboarding changes; this file and current code describe the new behavior.
