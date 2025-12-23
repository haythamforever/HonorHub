const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const path = require('path');
const fs = require('fs');
const { getAll } = require('../database/init');

async function getEmailSettings() {
  const settings = await getAll('SELECT key, value FROM settings');
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

async function createSmtpTransporter(settings) {
  if (!settings.smtp_host || !settings.smtp_user) {
    throw new Error('SMTP settings not configured');
  }
  
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: settings.smtp_secure === 'true',
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass
    }
  });
}

function createResendClient(settings) {
  if (!settings.resend_api_key) {
    throw new Error('Resend API key not configured');
  }
  return new Resend(settings.resend_api_key);
}

function createMailgunClient(settings) {
  if (!settings.mailgun_api_key || !settings.mailgun_domain) {
    throw new Error('Mailgun settings not configured');
  }
  
  const mailgun = new Mailgun(formData);
  const region = settings.mailgun_region || 'us';
  
  return mailgun.client({
    username: 'api',
    key: settings.mailgun_api_key,
    url: region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
  });
}

async function sendWithSmtp(mailOptions, settings) {
  const transporter = await createSmtpTransporter(settings);
  return transporter.sendMail(mailOptions);
}

async function sendWithResend(mailOptions, settings) {
  const resend = createResendClient(settings);
  
  const emailData = {
    from: mailOptions.from,
    to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html
  };
  
  // Handle attachments for Resend
  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    emailData.attachments = mailOptions.attachments.map(att => ({
      filename: att.filename,
      content: fs.readFileSync(att.path).toString('base64')
    }));
  }
  
  const result = await resend.emails.send(emailData);
  
  if (result.error) {
    throw new Error(result.error.message || 'Failed to send email via Resend');
  }
  
  return result;
}

async function sendWithMailgun(mailOptions, settings) {
  const mg = createMailgunClient(settings);
  
  const messageData = {
    from: mailOptions.from,
    to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html
  };
  
  // Handle attachments for Mailgun
  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    messageData.attachment = mailOptions.attachments.map(att => ({
      filename: att.filename,
      data: fs.readFileSync(att.path)
    }));
  }
  
  const result = await mg.messages.create(settings.mailgun_domain, messageData);
  return result;
}

async function sendEmail(mailOptions, settings) {
  const provider = settings.email_provider || 'smtp';
  
  if (provider === 'resend') {
    return sendWithResend(mailOptions, settings);
  } else if (provider === 'mailgun') {
    return sendWithMailgun(mailOptions, settings);
  } else {
    return sendWithSmtp(mailOptions, settings);
  }
}

function getFromAddress(settings) {
  const provider = settings.email_provider || 'smtp';
  let fromName, fromEmail;
  
  if (provider === 'resend') {
    fromName = settings.resend_from_name || 'HonorHub';
    fromEmail = settings.resend_from_email || 'onboarding@resend.dev';
  } else if (provider === 'mailgun') {
    fromName = settings.mailgun_from_name || 'HonorHub';
    fromEmail = settings.mailgun_from_email || `noreply@${settings.mailgun_domain}`;
  } else {
    fromName = settings.smtp_from_name || 'HonorHub';
    fromEmail = settings.smtp_from_email || settings.smtp_user;
  }
  
  return `${fromName} <${fromEmail}>`;
}

async function sendCertificateEmail(options) {
  const { employee, tier, sender, customMessage, pdfPath } = options;
  
  const settings = await getEmailSettings();
  
  // Replace placeholders in subject and body templates
  let subject = settings.email_subject_template || 'Congratulations! You have been recognized as {tier}';
  let body = settings.email_body_template || 'Dear {employee_name},\n\nCongratulations!';
  
  const replacements = {
    '{tier}': tier.name,
    '{employee_name}': employee.name,
    '{custom_message}': customMessage || '',
    '{sender_name}': sender.name,
    '{company_name}': settings.company_name || 'Your Company'
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    body = body.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  // Handle escaped newlines in stored template
  body = body.replace(/\\n/g, '\n');
  
  const mailOptions = {
    from: getFromAddress(settings),
    to: employee.email,
    subject,
    text: body,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
      ${body.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
    </div>`
  };
  
  // Attach PDF if path is provided
  if (pdfPath) {
    const absolutePath = path.join(__dirname, '..', '..', pdfPath.replace(/^\//, ''));
    
    if (fs.existsSync(absolutePath)) {
      mailOptions.attachments = [{
        filename: `Certificate_${employee.name.replace(/\s+/g, '_')}.pdf`,
        path: absolutePath
      }];
    }
  }
  
  return sendEmail(mailOptions, settings);
}

async function sendTestEmail(testEmail) {
  const settings = await getEmailSettings();
  
  const provider = settings.email_provider || 'smtp';
  const providerName = provider === 'mailgun' ? 'Mailgun' : provider === 'resend' ? 'Resend' : 'SMTP';
  
  const mailOptions = {
    from: getFromAddress(settings),
    to: testEmail,
    subject: 'HonorHub - Test Email',
    text: `This is a test email from HonorHub using ${providerName}. If you received this, your email configuration is working correctly!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">🎉 HonorHub Test Email</h2>
        <p>This is a test email from HonorHub using <strong>${providerName}</strong>.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">
          This email was sent as a test from HonorHub Certificate Management System.
        </p>
      </div>
    `
  };
  
  return sendEmail(mailOptions, settings);
}

module.exports = { sendCertificateEmail, sendTestEmail };
