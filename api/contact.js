const nodemailer = require('nodemailer');

const escape = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

module.exports = async (req, res) => {
  // CORS (same-origin will not need it, but harmless)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { GMAIL_USER, GMAIL_APP_PASSWORD, RECIPIENT_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'Email is not configured on the server.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const {
    name = '', phone = '', email = '', service = '',
    date = '', time = '', passengers = '', carType = '',
    pickupLocation = '', message = '',
  } = body;

  if (!name || !phone || !service || !date) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const recipient = RECIPIENT_EMAIL || GMAIL_USER;

  const row = (label, value) => value
    ? `<tr><td style="padding:10px 14px;background:#fff7ed;border-bottom:1px solid #fed7aa;font-weight:600;color:#7c2d12;width:170px">${escape(label)}</td><td style="padding:10px 14px;background:#fff;border-bottom:1px solid #fed7aa;color:#1f2937">${escape(value)}</td></tr>`
    : '';

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#f9fafb;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.06)">
      <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 24px;color:#fff">
        <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.9">PandaCabs · New Booking</div>
        <h1 style="margin:8px 0 0;font-family:'Playfair Display',Georgia,serif;font-size:26px">🚖 New Booking Request</h1>
        <p style="margin:6px 0 0;opacity:.95">From <strong>${escape(name)}</strong> · ${escape(phone)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Full Name', name)}
        ${row('Phone', phone)}
        ${row('Email', email)}
        ${row('Service Type', service)}
        ${row('Travel Date', date)}
        ${row('Pickup Time', time)}
        ${row('Passengers', passengers)}
        ${row('Car Preference', carType)}
        ${row('Pickup Location', pickupLocation)}
        ${row('Notes', message)}
      </table>
      <div style="padding:18px 24px;background:#fff7ed;color:#7c2d12;font-size:13px;border-top:2px solid #fdba74">
        ⏱ Confirm within 30 minutes via call/WhatsApp.<br>
        📞 <a href="tel:${escape(phone)}" style="color:#ea580c;text-decoration:none;font-weight:600">Call ${escape(phone)}</a>
        ${email ? ` · ✉️ <a href="mailto:${escape(email)}" style="color:#ea580c;text-decoration:none;font-weight:600">${escape(email)}</a>` : ''}
      </div>
      <div style="padding:14px 24px;background:#111827;color:#9ca3af;font-size:12px;text-align:center">
        PandaCabs Tours & Travels · Sambhajinagar · Sent from pandacabs website
      </div>
    </div>
  </div>`;

  const text = `New PandaCabs booking
Name: ${name}
Phone: ${phone}
Email: ${email}
Service: ${service}
Date: ${date}  Time: ${time}
Passengers: ${passengers}  Car: ${carType}
Pickup: ${pickupLocation}
Notes: ${message}`;

  try {
    await transporter.sendMail({
      from: `"PandaCabs Website" <${GMAIL_USER}>`,
      to: recipient,
      replyTo: email || undefined,
      subject: `🚖 New Booking — ${name} (${service})`,
      text,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email.' });
  }
};