let paypalSdkInstance = null;
let sdkLoadPromise = null;

async function ensurePayPalSdk() {
  if (paypalSdkInstance) return paypalSdkInstance;
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = (async () => {
    const cfg = await apiFetch('/api/config/paypal');
    if (!cfg.ok) throw new Error('Could not load PayPal configuration');
    const clientId = cfg.data.clientId;

    if (!window.paypal) {
      await new Promise((resolve, reject) => {
        const existing = document.getElementById('paypal-sdk-v6-core');
        if (existing) {
          if (window.paypal) return resolve();
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('PayPal SDK failed')));
          return;
        }
        const script = document.createElement('script');
        script.id = 'paypal-sdk-v6-core';
        script.src = 'https://www.sandbox.paypal.com/web-sdk/v6/core';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('PayPal SDK failed to load'));
        document.body.appendChild(script);
      });
    }

    if (!window.paypal || typeof window.paypal.createInstance !== 'function') {
      throw new Error('PayPal SDK not ready. Check script loading.');
    }

    paypalSdkInstance = await window.paypal.createInstance({
      clientId: clientId,
      components: ['paypal-payments'],
      pageType: 'checkout',
    });

    return paypalSdkInstance;
  })();

  try {
    return await sdkLoadPromise;
  } catch (err) {
    sdkLoadPromise = null;
    throw err;
  }
}

async function renderPayPalButton(orderId) {
  const container = document.getElementById('paypal-button-container');
  container.innerHTML = '<p class="muted">Loading PayPal button...</p>';

  try {
    const sdk = await ensurePayPalSdk();
    container.innerHTML = '';

    const button = document.createElement('paypal-button');

    button.addEventListener('click', async () => {
      const session = sdk.createPayPalOneTimePaymentSession({
        onApprove: async (data) => {
          // data.orderId is authoritative; fall back to closure orderId if absent
          const approvedOrderId = data?.orderId || orderId;
          console.log('Approved orderId from PayPal:', approvedOrderId);

          if (!approvedOrderId) {
            showAlert('alert', 'Missing order ID from PayPal approval.');
            return;
          }

          const res = await apiFetch('/api/paypal/capture-order', {
            method: 'POST',
            body: JSON.stringify({ paypalOrderId: approvedOrderId }),
          });

          if (res.ok) {
            if (typeof window.onCaptureSuccess === 'function') {
              window.onCaptureSuccess(res.data);
            }
          } else {
            showAlert('alert', res.data?.message || 'Payment capture failed.');
          }
        },
        onCancel: () => {
          showAlert('alert', 'Payment cancelled. No credits were added.', 'info');
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          showAlert('alert', 'PayPal encountered an error. Please try again.');
        },
      });

      await session.start(
        { presentationMode: 'auto' },
        Promise.resolve({ orderId: orderId })
      );
    });

    container.appendChild(button);
  } catch (err) {
    console.error('PayPal button render error:', err);
    container.innerHTML = '<p class="muted">Could not load PayPal. Please refresh and try again.</p>';
  }
}