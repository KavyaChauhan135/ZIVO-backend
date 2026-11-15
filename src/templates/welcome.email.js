/**
 * Welcome email template.
 *
 * Email HTML rules followed here: table-based layout, inline styles (Gmail strips most
 * <style> rules except media queries), a 600px max-width card, a "bulletproof" button
 * with a VML fallback for Outlook, and system font fallbacks for clients that block web fonts.
 */

const BRAND = Object.freeze({
  pageBg: "#f5f3ef",
  cardBg: "#ffffff",
  ink: "#141414",
  text: "#3d3d3d",
  muted: "#8a8580",
  line: "#ece8e1",
  gold: "#c9a46c",
  goldSoft: "#f7f1e7",
});

const FONT_SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const FONT_SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapeHtml = (str) =>
  String(str ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const FEATURES = [
  {
    title: "Curated Collections",
    text: "Hand-picked products, refreshed with new arrivals every week.",
  },
  {
    title: "Secure Checkout",
    text: "Your payments and personal details are always protected.",
  },
  {
    title: "Dedicated Support",
    text: "Questions about an order? Just reply to this email.",
  },
];

const logoBlock = ({ storeName, logoUrl, homeUrl }) =>
  logoUrl
    ? `<a href="${homeUrl}" target="_blank" style="text-decoration:none;">
         <img src="${escapeHtml(logoUrl)}" alt="${storeName}" width="150"
              style="display:block;margin:0 auto;width:150px;max-width:150px;height:auto;border:0;outline:none;color:#ffffff;font-family:${FONT_SERIF};font-size:24px;">
       </a>`
    : `<a href="${homeUrl}" target="_blank"
          style="text-decoration:none;color:#ffffff;font-family:${FONT_SERIF};font-size:26px;line-height:32px;font-weight:600;letter-spacing:1px;">
         ${storeName}
       </a>`;

const featureColumn = ({ title, text }) => `
  <!--[if mso]><td width="33%" valign="top" style="padding:0 8px;"><![endif]-->
  <div class="feature-col" style="display:inline-block;width:100%;max-width:176px;vertical-align:top;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 8px 24px 8px;text-align:center;">
          <div style="width:32px;height:2px;background-color:${BRAND.gold};margin:0 auto 14px auto;line-height:2px;font-size:2px;">&nbsp;</div>
          <p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:13px;line-height:18px;font-weight:600;letter-spacing:0.5px;color:${BRAND.ink};">${title}</p>
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;line-height:20px;color:${BRAND.muted};">${text}</p>
        </td>
      </tr>
    </table>
  </div>
  <!--[if mso]></td><![endif]-->`;

/**
 * @param {{ name: string, email: string }} user
 * @param {{ storeName: string, logoUrl?: string, clientUrl: string }} options
 * @returns {{ subject: string, text: string, html: string }}
 */
export const welcomeEmail = (user, { storeName, logoUrl, clientUrl }) => {
  const firstName = String(user.name || "").trim().split(/\s+/)[0] || "there";
  const year = new Date().getFullYear();
  const base = clientUrl.replace(/\/+$/, "");

  const safe = {
    firstName: escapeHtml(firstName),
    email: escapeHtml(user.email),
    storeName: escapeHtml(storeName),
    shopUrl: escapeHtml(`${base}/`),
    aboutUrl: escapeHtml(`${base}/about`),
    servicesUrl: escapeHtml(`${base}/services`),
  };

  const subject = `Welcome to ${storeName}, ${firstName}!`;
  const preheader = `Your ${storeName} account is ready. Discover something you'll love.`;

  const text = [
    `Welcome to ${storeName}, ${firstName}!`,
    "",
    "Thank you for joining us. Your account has been created and you're all set to start exploring.",
    "",
    `Account email: ${user.email}`,
    "",
    `Start shopping: ${base}/`,
    "",
    "Questions? Just reply to this email and our team will help.",
    "",
    "Didn't create this account? You can safely ignore this email.",
    "",
    `© ${year} ${storeName}. All rights reserved.`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    .cta-btn:hover { background-color: #000000 !important; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .hero-title { font-size: 30px !important; line-height: 38px !important; }
      .feature-col { max-width: 100% !important; }
      .cta-btn { display: block !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${BRAND.pageBg};">
  <!-- Preheader: the preview line shown next to the subject in the inbox -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BRAND.pageBg};opacity:0;">
    ${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background-color:${BRAND.cardBg};border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:${BRAND.ink};padding:36px 40px 32px 40px;">
              ${logoBlock({ storeName: safe.storeName, logoUrl, homeUrl: safe.shopUrl })}
              <div style="width:40px;height:2px;background-color:${BRAND.gold};margin:18px auto 0 auto;line-height:2px;font-size:2px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td class="px" align="center" style="padding:52px 56px 12px 56px;">
              <p style="margin:0 0 14px 0;font-family:${FONT_SANS};font-size:12px;line-height:16px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${BRAND.gold};">
                Welcome to the family
              </p>
              <h1 class="hero-title" style="margin:0 0 20px 0;font-family:${FONT_SERIF};font-size:36px;line-height:44px;font-weight:600;color:${BRAND.ink};">
                Hello, ${safe.firstName}.
              </h1>
              <p style="margin:0 0 32px 0;font-family:${FONT_SANS};font-size:16px;line-height:26px;color:${BRAND.text};">
                Thank you for joining <strong style="color:${BRAND.ink};font-weight:600;">${safe.storeName}</strong>.
                Your account is ready, and we can't wait for you to discover pieces you'll love.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:${BRAND.ink};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safe.shopUrl}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="${BRAND.ink}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;letter-spacing:1px;">START SHOPPING &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${safe.shopUrl}" target="_blank" class="cta-btn"
                       style="display:inline-block;padding:17px 44px;font-family:${FONT_SANS};font-size:14px;line-height:18px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${BRAND.ink};border-bottom:3px solid ${BRAND.gold};">
                      Start Shopping &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Account details -->
          <tr>
            <td class="px" style="padding:36px 56px 8px 56px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:${BRAND.goldSoft};border-radius:8px;">
                <tr>
                  <td style="padding:18px 22px;font-family:${FONT_SANS};font-size:14px;line-height:22px;color:${BRAND.text};text-align:center;">
                    <span style="color:${BRAND.muted};">Signed up as</span><br>
                    <strong style="color:${BRAND.ink};font-weight:600;word-break:break-all;">${safe.email}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="px" style="padding:36px 56px 32px 56px;">
              <div style="height:1px;background-color:${BRAND.line};line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Features: three columns on desktop, stacked on mobile -->
          <tr>
            <td class="px" align="center" style="padding:0 32px 16px 32px;font-size:0;text-align:center;">
              <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
              ${FEATURES.map(featureColumn).join("")}
              <!--[if mso]></tr></table><![endif]-->
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td class="px" align="center" style="padding:8px 56px 44px 56px;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:19px;color:${BRAND.muted};">
                Didn't create this account? You can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#faf8f5;border-top:1px solid ${BRAND.line};padding:32px 40px;">
              <p style="margin:0 0 14px 0;font-family:${FONT_SERIF};font-size:18px;line-height:24px;font-weight:600;color:${BRAND.ink};">
                ${safe.storeName}
              </p>
              <p style="margin:0 0 18px 0;font-family:${FONT_SANS};font-size:13px;line-height:20px;">
                <a href="${safe.shopUrl}" target="_blank" style="color:${BRAND.text};text-decoration:none;">Shop</a>
                <span style="color:${BRAND.gold};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                <a href="${safe.aboutUrl}" target="_blank" style="color:${BRAND.text};text-decoration:none;">About Us</a>
                <span style="color:${BRAND.gold};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                <a href="${safe.servicesUrl}" target="_blank" style="color:${BRAND.text};text-decoration:none;">Services</a>
              </p>
              <p style="margin:0 0 6px 0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${BRAND.muted};">
                Need help? Simply reply to this email.
              </p>
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:18px;color:${BRAND.muted};">
                &copy; ${year} ${safe.storeName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->

        <p style="margin:20px 0 0 0;font-family:${FONT_SANS};font-size:11px;line-height:16px;color:${BRAND.muted};">
          You're receiving this email because an account was created with this address.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
};
