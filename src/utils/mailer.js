import nodemailer from 'nodemailer';

export const mailTransporter = nodemailer.createTransport({
  host: process.env.ELASTIC_SMTP_HOST,
  port: Number(process.env.ELASTIC_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.ELASTIC_SMTP_USER,
    pass: process.env.ELASTIC_SMTP_PASS,
  },
});
