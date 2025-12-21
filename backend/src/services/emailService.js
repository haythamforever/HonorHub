const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/init');

function getEmailSettings() {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  settings.forEach(s => {
    settingsObj[s.key] = s.value;
  });
  return settingsObj;
}

function createTransporter() {
  const settings = getEmailSettings();
  
  if (!settings.smtp_host || !settings.smtp_user) {
    throw new Error('Email settings not configured');
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

async function sendCertificateEmail(options) {
  const { employee, tier, sender, customMessage, pdfPath } = options;
  
  const settings = getEmailSettings();
  const transporter = createTransporter();
  
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
    from: `"${settings.smtp_from_name || 'HonorHub'}" <${settings.smtp_from_email || settings.smtp_user}>`,
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
  
  return transporter.sendMail(mailOptions);
}

async function sendTestEmail(testEmail) {
  const settings = getEmailSettings();
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"${settings.smtp_from_name || 'HonorHub'}" <${settings.smtp_from_email || settings.smtp_user}>`,
    to: testEmail,
    subject: 'HonorHub - Test Email',
    text: 'This is a test email from HonorHub. If you received this, your email configuration is working correctly!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">🎉 HonorHub Test Email</h2>
        <p>This is a test email from HonorHub.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">
          This email was sent as a test from HonorHub Certificate Management System.
        </p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

module.exports = { sendCertificateEmail, sendTestEmail };

