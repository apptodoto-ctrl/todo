import nodemailer from "nodemailer";

export interface MailAttachment {
  filename: string;
  /** contenido en base64 */
  content: string;
  contentType?: string;
}

async function sendWithResend(to: string, subject: string, html: string, attachments?: MailAttachment[]) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `TOdo Therapy <${process.env.MAIL_USER}>`,
      to: [to],
      subject,
      html,
      reply_to: process.env.MAIL_USER,
      ...(attachments?.length
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function sendWithSmtp(to: string, subject: string, html: string, attachments?: MailAttachment[]) {
  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  await transporter.sendMail({
    from: `"TOdo Therapy" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content, "base64"),
            contentType: a.contentType,
          })),
        }
      : {}),
  });
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: MailAttachment[]) {
  if (process.env.RESEND_API_KEY) {
    await sendWithResend(to, subject, html, attachments);
  } else {
    await sendWithSmtp(to, subject, html, attachments);
  }
}
