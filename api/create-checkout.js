export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { amountInCents } = req.body;
  if (!amountInCents) return res.status(400).json({ error: 'Missing amount' });

  try {
    const resp = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: 'ZAR',
        successUrl: 'https://nexgen-industry-site.vercel.app/?payment=success',
        cancelUrl: 'https://nexgen-industry-site.vercel.app/?payment=cancel',
        failureUrl: 'https://nexgen-industry-site.vercel.app/?payment=failed'
      })
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.displayMessage || data.message || 'Checkout creation failed' });

    return res.json({ checkoutId: data.id, redirectUrl: data.redirectUrl });
  } catch (err) {
    console.error('Yoco create-checkout error:', err);
    return res.status(500).json({ error: 'Payment server error' });
  }
}
