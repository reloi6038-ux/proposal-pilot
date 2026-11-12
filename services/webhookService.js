const axios = require('axios');

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

/**
 * Get an OAuth access token for PayPal API calls.
 * PayPal tokens last ~9 hours; caching is recommended in production.
 */
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${PAYPAL_API_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
}

/**
 * Verify a webhook signature using PayPal's postback API.
 * @param {Object} headers - req.headers
 * @param {Buffer} rawBody - req.rawBody (unparsed)
 * @returns {Promise<boolean>}
 */
async function verifyWebhookSignature(headers, rawBody) {
  const {
    'paypal-transmission-id': transmissionId,
    'paypal-transmission-time': transmissionTime,
    'paypal-cert-url': certUrl,
    'paypal-auth-algo': authAlgo,
    'paypal-transmission-sig': transmissionSig,
  } = headers;

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('Missing required PayPal webhook headers');
    return false;
  }

  const accessToken = await getAccessToken();

  // Parse raw body to JSON ONLY for the webhook_event field.
  // The raw bytes are preserved in rawBody for CRC if self-verifying,
  // but for postback we send the parsed event as PayPal expects.
  const webhookEvent = JSON.parse(rawBody.toString('utf8'));

  const verificationPayload = {
    auth_algo: authAlgo,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_sig: transmissionSig,
    transmission_time: transmissionTime,
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: webhookEvent,
  };

  const response = await axios.post(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    verificationPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data.verification_status === 'SUCCESS';
}

module.exports = { verifyWebhookSignature };