import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

const hasSmtp = Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT || 587,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<{ sent: boolean; logged: boolean }> {
  if (hasSmtp && transporter) {
    try {
      await transporter.sendMail({
        from: config.SMTP_FROM,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return { sent: true, logged: false };
    } catch (err) {
      logger.error(err, 'Failed to send email');
      // Fall through to console logging
    }
  }

  // Console fallback
  logger.info(
    {
      emailTo: options.to,
      emailSubject: options.subject,
      emailBody: options.text,
    },
    '📧 [EMAIL LOG - No SMTP configured]'
  );
  return { sent: false, logged: true };
}
