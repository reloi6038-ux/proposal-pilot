const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  createPayPalOrder,
  capturePayPalOrder,
  getTransactions,
} = require('../controllers/paypalController');

router.post(
  '/create-order',
  protect,
  [
    body('packId')
      .isIn(['starter', 'pro'])
      .withMessage('Invalid packId. Allowed: starter, pro'),
  ],
  validate,
  createPayPalOrder
);

router.post(
  '/capture-order',
  protect,
  [
    body('paypalOrderId')
      .isString()
      .trim()
      .isLength({ min: 5, max: 64 })
      .withMessage('Invalid paypalOrderId'),
  ],
  validate,
  capturePayPalOrder
);

router.get('/transactions', protect, getTransactions);

module.exports = router;