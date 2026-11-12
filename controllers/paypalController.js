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
    if (!paypalOrderId || typeof paypalOrderId !== 'string' || paypalOrderId.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing paypalOrderId' });
    }

    const transaction = await Transaction.findOne({ paypalOrderId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this transaction' });
    }

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

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { paypalOrderId, status: 'PENDING' },
      { status: 'COMPLETED', paypalCaptureId: captureId },
      { returnDocument: 'after' }
    );

    if (!updatedTransaction) {
      const freshUser = await User.findById(req.user._id).select('credits');
      return res.json({
        message: 'Payment already captured',
        credits: freshUser.credits,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { credits: updatedTransaction.creditsAdded } },
      { returnDocument: 'after' }
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

// @desc    Get current user's transaction history
// @route   GET /api/paypal/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('paypalOrderId paypalCaptureId amount currency status creditsAdded createdAt');

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
};

module.exports = { createPayPalOrder, capturePayPalOrder, getTransactions };