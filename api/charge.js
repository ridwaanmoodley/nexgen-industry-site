export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, amountInCents, customer, items, orderId } = req.body;

  if (!token || !amountInCents) {
    return res.status(400).json({ error: 'Missing token or amount' });
  }

  try {
    const yocoResp = await fetch('https://online.yoco.com/v1/charges/', {
      method: 'POST',
      headers: {
        'X-Auth-Secret-Key': process.env.YOCO_SECRET_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: 'ZAR',
        metadata: {
          orderId,
          customerName: customer?.name,
          customerEmail: customer?.email,
          customerPhone: customer?.phone,
          deliveryAddress: customer?.address
        }
      })
    });

    const charge = await yocoResp.json();

    if (charge.status === 'successful') {
      return res.json({
        success: true,
        chargeId: charge.id,
        orderId: orderId || ('NG-' + Date.now())
      });
    } else {
      return res.status(400).json({
        success: false,
        error: charge.displayMessage || charge.errorCode || 'Payment was declined'
      });
    }
  } catch (err) {
    console.error('Charge error:', err);
    return res.status(500).json({ success: false, error: 'Server error — please try again' });
  }
}
