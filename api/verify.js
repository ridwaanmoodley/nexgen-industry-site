import { brevoSend, orderNotifyHtml, orderConfirmHtml } from './_email.js';

const PARCEL_WEIGHTS = {
  'NH42': 3, 'NH42-CT': 4, 'NH42-BP': 4.5,
  'NH52': 4, 'NH65': 7, 'NH100': 12,
  'STD-KEYCHAIN-BULK': 0.1, 'STD-KEYCHAIN-SINGLE': 0.1,
  'MED-KEYCHAIN-BULK': 0.1, 'MED-KEYCHAIN-SINGLE': 0.1,
  'LRG-KEYCHAIN-BULK': 0.15, 'LRG-KEYCHAIN-SINGLE': 0.15,
  'NFC-CARD-BULK': 0.05, 'NFC-CARD-SINGLE': 0.05,
  'TABLE-TALKER': 0.3, 'NFC-WRISTBAND': 0.05
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { checkoutId, customer, items, subtotalCents, vatCents, deliveryCents, totalCents, deliveryOption } = req.body;
  if (!checkoutId) return res.status(400).json({ error: 'Missing checkoutId' });

  // Verify payment with Yoco
  let checkout;
  try {
    const yocoResp = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
      headers: { 'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}` }
    });
    checkout = await yocoResp.json();
  } catch (err) {
    console.error('Yoco verify error:', err);
    return res.status(500).json({ error: 'Could not verify payment' });
  }

  if (checkout.status !== 'complete') {
    return res.status(400).json({ success: false, error: 'Payment not completed' });
  }

  const ref = 'NG-' + Date.now();

  // Create Courier Guy waybill via Shiplogic
  try {
    const totalWeight = Math.max(
      (items || []).reduce((sum, item) => sum + (PARCEL_WEIGHTS[item.id] || 0.5) * item.qty, 0),
      0.5
    );

    const shipResp = await fetch('https://api.shiplogic.com/v2/shipments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.TCG_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_level_code: deliveryOption?.code || 'ECO',
        special_instructions_collection: 'NEXGEN Industry order ' + ref,
        special_instructions_delivery: 'Please handle with care',
        collection_address: {
          type: 'business', company: 'NEXGEN Industry',
          street_address: '14 Cathcart Road', local_area: 'Humewood',
          city: 'Port Elizabeth', zone: 'Eastern Cape', country: 'ZA', code: '6001',
          contact: { name: 'Ridwaan Moodley', mobile_number: '0722419111', email: 'ridwaan@nexgenindustry.co.za' }
        },
        delivery_address: {
          type: 'residential',
          street_address: customer?.street || '',
          local_area: customer?.suburb || '',
          city: customer?.city || '',
          zone: customer?.province || '',
          country: 'ZA',
          code: customer?.postal || '',
          contact: { name: customer?.name || '', mobile_number: customer?.phone || '', email: customer?.email || '' }
        },
        parcels: [{ submitted_length_cm: 30, submitted_width_cm: 25, submitted_height_cm: 20, submitted_weight_kg: totalWeight, description: ref }],
        declared_value: totalCents / 100
      })
    });

    const shipData = await shipResp.json();
    const waybill = shipData.short_tracking_reference || shipData.tracking_reference || null;

    const emailData = { orderId: ref, customer, items, subtotalCents, vatCents, deliveryCents, totalCents, waybill, deliveryOption };
    brevoSend({ to: 'ridwaan@nexgenindustry.co.za', toName: 'Ridwaan Moodley', subject: `New Order ${ref} — R${(totalCents / 100).toFixed(2)}`, html: orderNotifyHtml(emailData) }).catch(console.error);
    if (customer?.email) {
      brevoSend({ to: customer.email, toName: customer.name, subject: `Your NEXGEN Industry order is confirmed — ${ref}`, html: orderConfirmHtml(emailData) }).catch(console.error);
    }

    return res.json({ success: true, orderId: ref, waybill });
  } catch (err) {
    console.error('Shiplogic error:', err);
    const emailData = { orderId: ref, customer, items, subtotalCents, vatCents, deliveryCents, totalCents, waybill: null, deliveryOption };
    brevoSend({ to: 'ridwaan@nexgenindustry.co.za', toName: 'Ridwaan Moodley', subject: `New Order ${ref} — R${(totalCents / 100).toFixed(2)} (waybill failed)`, html: orderNotifyHtml(emailData) }).catch(console.error);
    if (customer?.email) {
      brevoSend({ to: customer.email, toName: customer.name, subject: `Your NEXGEN Industry order is confirmed — ${ref}`, html: orderConfirmHtml(emailData) }).catch(console.error);
    }
    return res.json({ success: true, orderId: ref, waybillError: true });
  }
}
