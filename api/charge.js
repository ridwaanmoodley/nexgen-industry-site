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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, amountInCents, customer, items, orderId, deliveryOption } = req.body;
  if (!token || !amountInCents) return res.status(400).json({ error: 'Missing token or amount' });

  // 1. Charge card via Yoco
  let charge;
  try {
    const yocoResp = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: { 'X-Auth-Secret-Key': process.env.YOCO_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: 'ZAR',
        metadata: { orderId, customerName: customer?.name, customerEmail: customer?.email }
      })
    });
    charge = await yocoResp.json();
  } catch (err) {
    console.error('Yoco error:', err);
    return res.status(500).json({ success: false, error: 'Payment server error' });
  }

  if (charge.status !== 'successful') {
    return res.status(400).json({ success: false, error: charge.displayMessage || 'Payment declined' });
  }

  // 2. Create Courier Guy waybill via Shiplogic
  const ref = orderId || ('NG-' + Date.now());
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
        declared_value: amountInCents / 100
      })
    });

    const shipData = await shipResp.json();
    const waybill = shipData.short_tracking_reference || shipData.tracking_reference || ref;

    return res.json({ success: true, chargeId: charge.id, orderId: ref, waybill });
  } catch (err) {
    console.error('Shiplogic error:', err);
    // Payment succeeded but waybill failed — still return success, log for manual follow-up
    return res.json({ success: true, chargeId: charge.id, orderId: ref, waybillError: true });
  }
}
