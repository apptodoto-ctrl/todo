import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

async function sendWithResend(to: string, subject: string, html: string) {
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
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

async function sendWithSmtp(to: string, subject: string, html: string) {
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
  });
}

export async function POST(req: NextRequest) {
  const { to, subject, html } = await req.json();

  if (!to || !subject || !html) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    if (process.env.RESEND_API_KEY) {
      await sendWithResend(to, subject, html);
    } else {
      await sendWithSmtp(to, subject, html);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
