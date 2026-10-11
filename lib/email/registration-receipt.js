import nodemailer from "nodemailer";

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
  const rosterText = players.map((player, index) =>
    `${index + 1}. ${player.full_name}${index === 0 ? " (Captain)" : ""} — ${player.ign}`,
  ).join("\n");

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
      "",
      "Registered roster:",
      rosterText,
      "",
      `Verify registration: ${verificationUrl}`,
    ].join("\n"),
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
