const express = require('express');
const router = express.Router();
const { handlePayPalWebhook } = require('../controllers/webhookController');

// No `protect` middleware — webhooks come from PayPal, not from a logged-in user.
// Security is enforced by signature verification inside the controller.
router.post('/paypal', handlePayPalWebhook);

module.exports = router;