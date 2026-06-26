import { brevoSend, contactEmailHtml } from './_email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, interest, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  try {
    await brevoSend({
      to: 'ridwaan@nexgenindustry.co.za',
      toName: 'Ridwaan Moodley',
      subject: `New Enquiry from ${name}${interest ? ' — ' + interest : ''}`,
      html: contactEmailHtml({ name, email, phone, interest, message })
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Contact email error:', err);
    return res.status(500).json({ error: 'Failed to send enquiry' });
  }
}
