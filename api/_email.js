export async function brevoSend({ to, toName, subject, html }) {
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'NEXGEN Industry', email: 'ridwaan@nexgenindustry.co.za' },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html
    })
  });
  if (!resp.ok) console.error('Brevo error:', resp.status, await resp.text());
  return resp.ok;
}

const fmt = c => 'R' + (c / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const header = `
  <div style="background:#080a10;padding:24px 32px;">
    <span style="font-size:22px;font-weight:700;color:#c0392b;">NEX</span><span style="font-size:22px;font-weight:700;color:#2563b0;">GEN</span>
    <span style="font-size:22px;font-weight:700;color:#fff;"> INDUSTRY</span>
  </div>`;

function wrap(body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;font-family:Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    ${header}
    <div style="padding:32px;">${body}</div>
  </div></body></html>`;
}

export function orderNotifyHtml({ orderId, customer, items, subtotalCents, vatCents, deliveryCents, totalCents, waybill, deliveryOption }) {
  const itemRows = (items || []).map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">×${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${fmt((i.price || 0) * i.qty)}</td>
    </tr>`).join('');

  const waybillBlock = waybill
    ? `<div style="background:#f0f7f0;border:1px solid #4caf50;border-radius:6px;padding:16px;margin-bottom:24px;">
        <strong style="color:#2e7d32;">Waybill Created: ${waybill}</strong><br>
        <span style="color:#555;font-size:13px;">Track at thecourierguy.co.za</span>
      </div>`
    : `<div style="background:#fff8e1;border:1px solid #ffc107;border-radius:6px;padding:16px;margin-bottom:24px;">
        <strong style="color:#e65100;">Waybill not auto-created — please create manually in your Courier Guy portal</strong>
      </div>`;

  return wrap(`
    <h2 style="color:#080a10;margin:0 0 4px;">New Order Received</h2>
    <p style="color:#666;margin:0 0 24px;">Order ID: <strong>${orderId}</strong></p>

    <h3 style="color:#080a10;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Customer</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:4px 0;color:#666;width:100px;">Name</td><td><strong>${customer.name}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666;">Email</td><td><a href="mailto:${customer.email}">${customer.email}</a></td></tr>
      <tr><td style="padding:4px 0;color:#666;">Phone</td><td>${customer.phone}</td></tr>
      <tr><td style="padding:4px 0;color:#666;vertical-align:top;">Address</td><td>${customer.street}, ${customer.suburb}, ${customer.city}, ${customer.province} ${customer.postal}</td></tr>
    </table>

    <h3 style="color:#080a10;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Order Summary</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${itemRows}
      <tr><td colspan="2" style="padding:8px 0;color:#666;">Subtotal (ex VAT)</td><td style="text-align:right;">${fmt(subtotalCents)}</td></tr>
      <tr><td colspan="2" style="padding:8px 0;color:#666;">VAT (15%)</td><td style="text-align:right;">${fmt(vatCents)}</td></tr>
      <tr><td colspan="2" style="padding:8px 0;color:#666;">Delivery — ${deliveryOption?.name || 'Standard'}</td><td style="text-align:right;">${fmt(deliveryCents)}</td></tr>
      <tr style="border-top:2px solid #080a10;">
        <td colspan="2" style="padding:12px 0;font-weight:700;font-size:16px;">Total Charged</td>
        <td style="padding:12px 0;font-weight:700;font-size:16px;text-align:right;">${fmt(totalCents)}</td>
      </tr>
    </table>

    ${waybillBlock}
  `);
}

export function orderConfirmHtml({ orderId, customer, items, subtotalCents, vatCents, deliveryCents, totalCents, deliveryOption }) {
  const firstName = (customer.name || '').split(' ')[0];
  const itemRows = (items || []).map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">×${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${fmt((i.price || 0) * i.qty)}</td>
    </tr>`).join('');

  return wrap(`
    <h2 style="color:#080a10;margin:0 0 8px;">Order Confirmed</h2>
    <p style="color:#555;margin:0 0 4px;">Hi ${firstName}, thank you for your order!</p>
    <p style="color:#666;margin:0 0 24px;font-size:14px;">Reference: <strong>${orderId}</strong></p>

    <h3 style="color:#080a10;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Your Order</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      ${itemRows}
      <tr><td colspan="2" style="padding:8px 0;color:#666;">Subtotal (ex VAT)</td><td style="text-align:right;">${fmt(subtotalCents)}</td></tr>
      <tr><td colspan="2" style="padding:8px 0;color:#666;">VAT (15%)</td><td style="text-align:right;">${fmt(vatCents)}</td></tr>
      <tr><td colspan="2" style="padding:8px 0;color:#666;">Delivery — ${deliveryOption?.name || 'Standard'}</td><td style="text-align:right;">${fmt(deliveryCents)}</td></tr>
      <tr style="border-top:2px solid #080a10;">
        <td colspan="2" style="padding:12px 0;font-weight:700;font-size:16px;">Total Paid</td>
        <td style="padding:12px 0;font-weight:700;font-size:16px;text-align:right;">${fmt(totalCents)}</td>
      </tr>
    </table>

    <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin-bottom:24px;">
      <strong>What happens next?</strong><br>
      <span style="color:#555;font-size:14px;">Your order will be dispatched from Port Elizabeth within 1–2 business days. The Courier Guy will collect your parcel and you'll receive a tracking number by SMS.</span>
    </div>

    <p style="color:#888;font-size:13px;">Questions? Email <a href="mailto:ridwaan@nexgenindustry.co.za" style="color:#2563b0;">ridwaan@nexgenindustry.co.za</a> or WhatsApp <a href="https://wa.me/27722419111" style="color:#2563b0;">+27 72 241 9111</a></p>
  `);
}

export function contactEmailHtml({ name, email, phone, interest, message }) {
  return wrap(`
    <h2 style="color:#080a10;margin:0 0 4px;">New Website Enquiry</h2>
    <p style="color:#666;margin:0 0 24px;">Submitted via nexgenindustry.co.za</p>

    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;color:#666;width:100px;border-bottom:1px solid #eee;">Name</td><td style="padding:10px 0;border-bottom:1px solid #eee;"><strong>${name}</strong></td></tr>
      <tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #eee;">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee;"><a href="mailto:${email}" style="color:#2563b0;">${email}</a></td></tr>
      ${phone ? `<tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #eee;">Phone</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${phone}</td></tr>` : ''}
      ${interest ? `<tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #eee;">Interest</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${interest}</td></tr>` : ''}
      <tr><td style="padding:10px 0;color:#666;vertical-align:top;">Message</td><td style="padding:10px 0;white-space:pre-wrap;">${message || '—'}</td></tr>
    </table>
  `);
}
