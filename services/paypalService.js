const {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
} = require('@paypal/paypal-server-sdk');

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
  },
  environment:
    process.env.PAYPAL_ENV === 'live'
      ? Environment.Production
      : Environment.Sandbox,
});

const ordersController = new OrdersController(client);

const createOrder = async ({ amount, currency, description }) => {
  const response = await ordersController.createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: currency,
            value: amount,
          },
          description,
        },
      ],
    },
  });
  return response.result;
};

/**
 * Capture an approved PayPal order.
 *
 * PayPal Server SDK expects an object with `id`:
 *   ordersController.captureOrder({ id: "ORDER_ID" })
 *
 * Passing a bare string causes "Argument for 'id' failed validation".
 */
const captureOrder = async (orderId) => {
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    throw new Error(`captureOrder received invalid orderId: ${orderId}`);
  }

  const { result } = await ordersController.captureOrder({ id: orderId });
  return result;
};

module.exports = { createOrder, captureOrder };