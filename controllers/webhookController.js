const Transaction = require('../models/Transaction');
const User = require('../models/User');
const WebhookEvent = require('../models/WebhookEvent');
const { verifyWebhookSignature } = require('../services/webhookService');

const handlePayPalWebhook = async (req, res) => {
  try {
    const isValid = await verifyWebhookSignature(req.headers, req.rawBody);
    if (!isValid) {
      console.warn('Invalid PayPal webhook signature');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.rawBody.toString('utf8'));
    const { id: eventId, event_type: eventType } = event;

    console.log(`PayPal webhook received: ${eventType} (${eventId})`);

    // Record the event ID; unique index makes this a race-safe dedup.
    try {
      await WebhookEvent.create({ eventId, eventType });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        console.log(`Webhook event ${eventId} already processed. Acknowledging.`);
        return res.status(200).json({ received: true, duplicate: true });
      }
      throw dupErr;
    }

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      await handleCaptureCompleted(event);
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
      await handleCaptureDenied(event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

async function handleCaptureCompleted(event) {
  const resource = event.resource;
  const captureId = resource.id;
  if (resource.status !== 'COMPLETED') return;

  const upLink = resource.links?.find((l) => l.rel === 'up');
  const orderId = upLink?.href?.split('/').pop();
  if (!orderId) {
    console.error('Could not extract order ID from capture webhook');
    return;
  }

  const transaction = await Transaction.findOne({ paypalOrderId: orderId });
  if (!transaction) {
    console.warn(`No transaction for order ${orderId}. Ignoring.`);
    return;
  }

  if (transaction.status === 'COMPLETED') {
    console.log(`Transaction ${orderId} already COMPLETED.`);
    return;
  }

  if (transaction.status !== 'PENDING') return;

  const updated = await Transaction.findOneAndUpdate(
    { paypalOrderId: orderId, status: 'PENDING' },
    { status: 'COMPLETED', paypalCaptureId: captureId },
    { new: true }
  );
  if (!updated) return;

  await User.findByIdAndUpdate(
    updated.userId,
    { $inc: { credits: updated.creditsAdded } }
  );

  console.log(`Webhook: Added ${updated.creditsAdded} credits for order ${orderId}.`);
}

async function handleCaptureDenied(event) {
  const resource = event.resource;
  const upLink = resource.links?.find((l) => l.rel === 'up');
  const orderId = upLink?.href?.split('/').pop();
  if (!orderId) return;

  await Transaction.findOneAndUpdate(
    { paypalOrderId: orderId, status: 'PENDING' },
    { status: 'FAILED' }
  );
  console.log(`Webhook: Capture denied for order ${orderId}.`);
}

module.exports = { handlePayPalWebhook };