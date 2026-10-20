export type AccountEmailKind = "verify" | "reset" | "welcome" | "password_changed";

export function accountEmail(kind: AccountEmailKind, url: string) {
  const content = {
    verify: ["Confirma tu correo de Norte360", "Confirma que este correo es tuyo para activar tu cuenta. El enlace vence en 30 minutos.", "Confirmar mi correo"],
    reset: ["Restablece tu contraseña de Norte360", "Recibimos una solicitud para restablecer tu contraseña. El enlace vence en 30 minutos y solo puede utilizarse una vez.", "Restablecer contraseña"],
    welcome: ["Bienvenido a Norte360", "Tu correo está confirmado. Empieza por registrar tus ingresos, gastos y deudas; después define tu primer Norte.", "Ir a mi cuenta"],
    password_changed: ["Tu contraseña de Norte360 cambió", "La contraseña de tu cuenta fue actualizada y se cerraron las sesiones existentes. Si no fuiste tú, recupera tu acceso ahora.", "Recuperar acceso"],
  }[kind];
  const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  return {
    subject: content[0],
    text: `${content[0]}\n\n${content[1]}\n\n${content[2]}: ${url}\n\nNorte360 está en acceso privado. El enlace puede pedirte el acceso privado antes de continuar.\nSi no solicitaste la creación o recuperación de una cuenta, ignora este correo.`,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f2f5f2;font-family:Arial,sans-serif;color:#18372a"><table role="presentation" width="100%"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:white"><tr><td style="padding:32px"><p style="font-size:24px;font-weight:bold;color:#126748">Norte360</p><h1 style="font-size:24px;line-height:1.3">${escape(content[0])}</h1><p style="line-height:1.7">${escape(content[1])}</p><p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;padding:14px 20px;background:#126748;color:white;text-decoration:none">${escape(content[2])}</a></p><p style="font-size:12px;line-height:1.7">Norte360 está en acceso privado. El enlace puede pedirte el acceso privado antes de continuar.</p><p style="font-size:12px;line-height:1.7">Si el botón no funciona: <a href="${escape(url)}" style="word-break:break-all">${escape(url)}</a></p><p style="font-size:12px;color:#637267">Si no solicitaste la creación o recuperación de una cuenta, ignora este correo.</p></td></tr></table></td></tr></table></body></html>`,
  };
}
