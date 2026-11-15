import nodemailer from "nodemailer";
import config, { isEmailEnabled } from "../config/config.js";

const transporter = isEmailEnabled
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
    })
  : null;

/** Checks the SMTP login once at startup so bad credentials show up immediately. */
export const verifyEmailTransport = async () => {
  if (!transporter) {
    console.warn("Email disabled: set EMAIL_USER and EMAIL_PASS to send emails");
    return;
  }
  try {
    await transporter.verify();
    console.log("Email transport ready");
  } catch (err) {
    console.error("Email transport failed to connect:", err.message);
  }
};

const escapeHtml = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) return;
  return transporter.sendMail({ from: config.EMAIL_FROM, to, subject, text, html });
};

/** Sends the "welcome" email to a newly registered user. */
export const sendWelcomeEmail = (user) => {
  const name = escapeHtml(user.name);
  const shopUrl = config.CLIENT_URL;

  return sendEmail({
    to: user.email,
    subject: "Welcome to our store!",
    text:
      `Hi ${user.name},\n\n` +
      `Thanks for registering! Your account (${user.email}) has been created successfully.\n\n` +
      `Start shopping: ${shopUrl}\n\n` +
      `If you did not create this account, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; color: #222;">
        <h2>Welcome, ${name}!</h2>
        <p>Thanks for registering. Your account <strong>${escapeHtml(user.email)}</strong> has been created successfully.</p>
        <p>
          <a href="${escapeHtml(shopUrl)}"
             style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Start shopping
          </a>
        </p>
        <p style="font-size: 12px; color: #777;">If you did not create this account, please ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Fire-and-forget: the welcome email must never slow down or break registration,
 * so failures are only logged.
 */
export const sendWelcomeEmailInBackground = (user) => {
  sendWelcomeEmail(user).catch((err) =>
    console.error(`Failed to send welcome email to ${user.email}:`, err.message),
  );
};
