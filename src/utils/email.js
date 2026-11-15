import nodemailer from "nodemailer";
import config, { isEmailEnabled } from "../config/config.js";
import { welcomeEmail } from "../templates/welcome.email.js";

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

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!transporter) return;
  return transporter.sendMail({ from: config.EMAIL_FROM, to, subject, text, html });
};

/** Sends the "welcome" email to a newly registered user. */
export const sendWelcomeEmail = (user) => {
  const { subject, text, html } = welcomeEmail(user, {
    storeName: config.STORE_NAME,
    logoUrl: config.STORE_LOGO_URL,
    clientUrl: config.CLIENT_URL,
  });
  return sendEmail({ to: user.email, subject, text, html });
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
