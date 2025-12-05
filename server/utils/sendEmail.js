// server/utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"TrackItAll" <no-reply@trackitall.app>`,
    to,
    subject,
    text,
    html: html || text,
  });
};

module.exports = sendEmail;
