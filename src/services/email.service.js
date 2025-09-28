import axios from "axios";

const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

export async function sendVerificationEmail(to, token) {
  const verificationUrl = `${process.env.BASE_URL}/auth/verify/${token}`;

  const params = new URLSearchParams();
  params.append("apikey", ELASTIC_API_KEY);
  params.append("subject", "Verify your email");
  params.append("from", "no-reply@ecomove.com"); // harus domain yang udah diverifikasi di ElasticEmail
  params.append("fromName", "Ecomove");
  params.append("to", to);
  params.append("isTransactional", "true");
  params.append(
    "bodyHtml",
    `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `
  );

  const res = await axios.post(
    "https://api.elasticemail.com/v2/email/send",
    params
  );

  return res.data;
}
