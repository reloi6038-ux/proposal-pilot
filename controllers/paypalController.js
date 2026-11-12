const CREDIT_PACKS = require('../config/creditPacks');
const { createOrder, captureOrder } = require('../services/paypalService');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const createPayPalOrder = async (req, res) => {
  try {
    const { packId } = req.body;
    const pack = CREDIT_PACKS[packId];
    if (!pack) {
      return res.status(400).json({ message: 'Invalid credit pack' });
    }

    const paypalOrder = await createOrder({
      amount: pack.amount,
      currency: pack.currency,
      description: `${pack.name} - ${pack.credits} credits`,
    });

    await Transaction.create({
      userId: req.user._id,
      paypalOrderId: paypalOrder.id,
      amount: pack.amount,
      currency: pack.currency,
      status: 'PENDING',
      creditsAdded: pack.credits,
    });

    res.status(201).json({
      paypalOrderId: paypalOrder.id,
      packName: pack.name,
      amount: pack.amount,
      currency: pack.currency,
      credits: pack.credits,
    });
  } catch (error) {
    console.error('Create PayPal order error:', error);
    res.status(500).json({ message: 'Failed to create PayPal order' });
  }
};

const capturePayPalOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.body;
    if (!paypalOrderId) {
      return res.status(400).json({ message: 'paypalOrderId is required' });
    }

    const transaction = await Transaction.findOne({ paypalOrderId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this transaction' });
    }

    // Idempotent: if already COMPLETED, return success without re-adding credits
    if (transaction.status === 'COMPLETED') {
      const freshUser = await User.findById(req.user._id).select('credits');
      return res.json({
        message: 'Payment already captured',
        credits: freshUser.credits,
      });
    }

    let captureResult;
    try {
      captureResult = await captureOrder(paypalOrderId);
    } catch (paypalError) {
      // PayPal may reject the capture (e.g., ORDER_ALREADY_CAPTURED)
      // Try to reconcile: fetch the order status from PayPal
      console.error('PayPal capture error:', paypalError.message);
      await Transaction.findOneAndUpdate(
        { paypalOrderId, status: 'PENDING' },
        { status: 'FAILED' }
      );
      return res.status(400).json({
        message: 'PayPal could not capture this payment. It may have already been captured or expired.',
      });
    }

    if (captureResult.status !== 'COMPLETED') {
      await Transaction.findOneAndUpdate(
        { paypalOrderId, status: 'PENDING' },
        { status: 'FAILED' }
      );
      return res.status(400).json({
        message: 'Payment capture was not completed',
        status: captureResult.status,
      });
    }

    const captureId =
      captureResult.purchaseUnits?.[0]?.payments?.captures?.[0]?.id || null;

    // Atomic transition: only PENDING -> COMPLETED counts
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { paypalOrderId, status: 'PENDING' },
      { status: 'COMPLETED', paypalCaptureId: captureId },
      { new: true }
    );

    if (!updatedTransaction) {
      // Race condition: another request already completed it
      const freshUser = await User.findById(req.user._id).select('credits');
      return res.json({
        message: 'Payment already captured',
        credits: freshUser.credits,
      });
    }

    // Add credits atomically
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: updatedTransaction.creditsAdded } },
      { new: true }
    ).select('credits');

    res.json({
      message: 'Payment captured successfully',
      credits: updatedUser.credits,
      creditsAdded: updatedTransaction.creditsAdded,
    });
  } catch (error) {
    console.error('Capture PayPal order error:', error);
    res.status(500).json({ message: 'Failed to capture payment' });
  }
};

module.exports = { createPayPalOrder, capturePayPalOrder };