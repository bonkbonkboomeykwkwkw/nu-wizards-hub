import nodemailer from "nodemailer";
import QRCode from "qrcode";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatSubmittedAt = (value) => new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
}).format(new Date(value)) + " PHT";

export async function sendRegistrationReceipt({
  to,
  teamId,
  teamName,
  tournamentTitle,
  gameName,
  registeredAt,
  verificationUrl,
  players,
}) {
  const user = process.env.RECEIPT_SMTP_USER?.trim();
  const password = process.env.RECEIPT_SMTP_PASSWORD;
  if (!user || !password) return { configured: false, sent: false };

  const host = process.env.RECEIPT_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.RECEIPT_SMTP_PORT || 587);
  const fromEmail = process.env.RECEIPT_SMTP_FROM_EMAIL?.trim() || user;
  const fromName = process.env.RECEIPT_SMTP_FROM_NAME?.trim() || "NU Wizards Tournament Hub";
  const safeTeamName = String(teamName).replace(/[\r\n]+/g, " ").slice(0, 80);
  const submittedAt = formatSubmittedAt(registeredAt);
  const tournament = [tournamentTitle, gameName].filter(Boolean).join(" · ");
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  const qrCodeContent = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
  const rosterText = players.map((player, index) =>
    `${index + 1}. ${player.full_name}${index === 0 ? " (Captain)" : ""} — ${player.ign}`,
  ).join("\n");
  const rosterHtml = players.map((player, index) =>
    `<li>${escapeHtml(player.full_name)}${index === 0 ? " <strong>(Captain)</strong>" : ""} — ${escapeHtml(player.ign)}</li>`,
  ).join("");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const info = await transporter.sendMail({
    from: { name: fromName, address: fromEmail },
    to,
    subject: `NU Wizards registration receipt: ${safeTeamName}`,
    text: [
      "Your team registration was submitted successfully.",
      "",
      `Receipt ID: ${teamId}`,
      `Submitted: ${submittedAt}`,
      `Team: ${teamName}`,
      `Tournament: ${tournament}`,
      `Captain email: ${to}`,
      `Verify registration: ${verificationUrl}`,
      "",
      "Registered roster:",
      rosterText,
      "",
      "Open the verification link above to check your registration. The HTML receipt also contains a QR code.",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><main style="max-width:600px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:16px"><p style="color:#a16207;font-weight:bold;letter-spacing:.12em;text-transform:uppercase">NU Wizards Tournament Hub</p><h1 style="margin-bottom:8px">Registration receipt</h1><p style="color:#047857">Your team registration was submitted successfully.</p><table style="width:100%;border-collapse:collapse;margin:24px 0"><tr><td style="padding:8px 0;color:#64748b">Receipt ID</td><td style="padding:8px 0;font-family:monospace;word-break:break-all">${escapeHtml(teamId)}</td></tr><tr><td style="padding:8px 0;color:#64748b">Submitted</td><td style="padding:8px 0">${escapeHtml(submittedAt)}</td></tr><tr><td style="padding:8px 0;color:#64748b">Team</td><td style="padding:8px 0">${escapeHtml(teamName)}</td></tr><tr><td style="padding:8px 0;color:#64748b">Tournament</td><td style="padding:8px 0">${escapeHtml(tournament)}</td></tr><tr><td style="padding:8px 0;color:#64748b">Captain email</td><td style="padding:8px 0">${escapeHtml(to)}</td></tr></table><h2 style="font-size:16px">Registered roster</h2><ol>${rosterHtml}</ol><section style="margin-top:24px;padding:18px;border:1px solid #e2e8f0;border-radius:12px;text-align:center"><h2 style="font-size:16px;margin-top:0">Verify your registration</h2><p style="color:#475569">Scan this code to check that your team was registered.</p><img src="cid:registration-verification-qr" width="180" height="180" alt="QR code to verify registration" style="display:block;margin:0 auto"/><p><a href="${escapeHtml(verificationUrl)}">Open registration check</a></p></section></main></body></html>`,
    attachments: [{
      filename: "registration-qr.png",
      content: qrCodeContent,
      contentType: "image/png",
      cid: "registration-verification-qr",
    }],
  });

  const acceptedCount = info.accepted?.length ?? 0;
  const rejectedCount = info.rejected?.length ?? 0;
  const responseCode = Number(info.response?.match(/^(\d{3})/)?.[1]) || null;

  return {
    configured: true,
    sent: acceptedCount > 0,
    acceptedCount,
    rejectedCount,
    responseCode,
    messageId: info.messageId ?? null,
  };
}
