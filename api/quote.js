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

  const { deliveryAddress, items } = req.body;
  if (!deliveryAddress || !items?.length) {
    return res.status(400).json({ error: 'Missing address or items' });
  }

  const totalWeight = Math.max(
    items.reduce((sum, item) => sum + (PARCEL_WEIGHTS[item.id] || 0.5) * item.qty, 0),
    0.5
  );

  const body = {
    collection_address: {
      type: 'business',
      company: 'NEXGEN Industry',
      street_address: '14 Cathcart Road',
      local_area: 'Humewood',
      city: 'Port Elizabeth',
      zone: 'Eastern Cape',
      country: 'ZA',
      code: '6001'
    },
    delivery_address: {
      type: 'residential',
      street_address: deliveryAddress.street,
      local_area: deliveryAddress.suburb,
      city: deliveryAddress.city,
      zone: deliveryAddress.province,
      country: 'ZA',
      code: deliveryAddress.postal
    },
    parcels: [{ submitted_length_cm: 30, submitted_width_cm: 25, submitted_height_cm: 20, submitted_weight_kg: totalWeight }],
    declared_value: 500
  };

  try {
    const resp = await fetch('https://api.shiplogic.com/v2/rates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TCG_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (!data.rates) return res.status(400).json({ error: data.message || 'Could not get rates' });

    const options = data.rates
      .filter(r => ['ECO', 'OVN'].includes(r.service_level.code))
      .map(r => ({
        code: r.service_level.code,
        name: r.service_level.name,
        description: r.service_level.description,
        rateCents: Math.round(r.rate * 100),
        deliveryFrom: r.service_level.delivery_date_from,
        deliveryTo: r.service_level.delivery_date_to
      }));

    return res.json({ success: true, options });
  } catch (err) {
    console.error('Quote error:', err);
    return res.status(500).json({ error: 'Could not fetch delivery rates' });
  }
}
