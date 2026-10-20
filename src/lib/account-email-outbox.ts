import { database } from "./db";
import { accountEmail } from "./account-emails";
import { emailConfigured, sendTransactionalEmail } from "./email";

// Only non-secret notifications are queued. Action links are sent directly and never stored in this table.
export async function deliverAccountEmails(userId: string) {
  if (!emailConfigured()) return;
  const sql = database();
  const rows = await sql`UPDATE account_email_outbox SET locked_until=NOW()+INTERVAL '5 minutes', attempts=attempts+1
    WHERE id IN (SELECT id FROM account_email_outbox WHERE user_id=${userId} AND sent_at IS NULL
      AND (locked_until IS NULL OR locked_until<NOW()) AND attempts<8 ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED)
    RETURNING id,kind`;
  for (const row of rows) {
    try {
      const users = await sql`SELECT email FROM users WHERE id=${userId} AND deleted_at IS NULL`;
      if (!users[0]) continue;
      const url = new URL(row.kind === "welcome" ? "/login" : "/account-action", process.env.APP_BASE_URL).href;
      const message = accountEmail(row.kind as "welcome" | "password_changed", url);
      await sendTransactionalEmail(String(users[0].email), message.subject, message.text, message.html);
      await sql`UPDATE account_email_outbox SET sent_at=NOW() WHERE id=${row.id}`;
    } catch { console.error("Account notification delivery pending"); }
  }
}
