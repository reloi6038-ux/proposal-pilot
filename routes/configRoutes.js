const express = require('express');
const router = express.Router();

router.get('/paypal', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID,
    currency: 'USD',
    env: process.env.PAYPAL_ENV || 'sandbox',
  });
});

module.exports = router;