import nodemailer from 'nodemailer';

export const mailTransporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_SMTP_HOST,
  port: Number(process.env.ELASTIC_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.MAILTRAP_SMTP_USER,
    pass: process.env.MAILTRAP_SMTP_PASS,
  },
});
