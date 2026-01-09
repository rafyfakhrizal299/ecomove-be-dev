import axios from "axios";

const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

export async function sendVerificationEmail(to, token) {
  const verificationUrl = `${token}`;

  const params = new URLSearchParams();
  params.append("apikey", ELASTIC_API_KEY);
  params.append("subject", "Verify your email");
  params.append("from", "hello@contakt-ph.com"); // harus domain yang udah diverifikasi di ElasticEmail
  params.append("fromName", "Ecomove");
  params.append("to", to);
  params.append("isTransactional", "true");
  params.append(
    "bodyHtml",
    `
      <h2>Email Verification</h2>
      <p>Use the 6-digit code below to verify your email:</p>
      <h1 style="letter-spacing: 5px;">${verificationUrl}</h1>
      <p>This code will expire in 10 minutes.</p>
    `
  );

  const res = await axios.post(
    "https://api.elasticemail.com/v2/email/send",
    params
  );

  return res.data;
}
export async function sendWelcomeEmail({ to, fullname }) {
  try {
    const info = await mailTransporter.sendMail({
      from: `"${process.env.ELASTIC_EMAIL_FROM_NAME}" <${process.env.ELASTIC_EMAIL_FROM}>`,
      to,
      subject: 'Welcome to Ecomove!',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Welcome to Ecomove!</h2>
          <p>Hi, <b>${fullname}</b>!</p>
          <p>
            Thank you for taking a step toward reducing carbon emissions and choosing
            a more sustainable way to move goods.
          </p>
          <p>
            We’re excited to have you with us and to take this eco-friendly journey.
          </p>
          <p><b>Welcome to Ecomove 💚</b></p>
          <br/>
          <p>
            Best,<br/>
            <b>Joy</b><br/>
            Founder, Ecomove
          </p>
        </div>
      `,
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Failed to send welcome email:', err.message);
  }
}