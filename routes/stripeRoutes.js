const express = require('express');
const router = express.Router();
const { createCheckoutSession, handleWebhook, verifySession } = require('../controllers/stripeController');

// Add express.json() here because this router is mounted BEFORE the global express.json() in app.js
router.post('/create-checkout-session', express.json(), createCheckoutSession);

router.get('/verify-session/:session_id', verifySession);

// Note: Stripe Webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
