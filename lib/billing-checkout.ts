export type GatewayProvider = 'esewa' | 'khalti';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function belongsToProvider(hostname: string, providerDomain: string) {
  return hostname === providerDomain || hostname.endsWith(`.${providerDomain}`);
}

export async function startGatewayCheckout({
  accessToken,
  product,
  packageCode,
  provider,
  couponCode,
  onOrderCreated,
}: {
  accessToken: string;
  product: 'agency_basic' | 'agency_pro' | 'exam_pass';
  packageCode: string;
  provider: GatewayProvider;
  couponCode: string;
  onOrderCreated: (orderId: string) => void;
}) {
  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product, packageCode, provider, couponCode }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : 'Could not start checkout. Please try again.';
    throw new Error(message);
  }
  if (!isRecord(payload) || typeof payload.orderId !== 'string' || payload.provider !== provider) {
    throw new Error('The payment service returned an invalid checkout response.');
  }

  const orderId = payload.orderId;

  if (provider === 'esewa') {
    if (typeof payload.action !== 'string' || !isStringRecord(payload.fields)) {
      throw new Error('eSewa did not return a valid payment form.');
    }
    const action = new URL(payload.action);
    if (action.protocol !== 'https:' || !belongsToProvider(action.hostname, 'esewa.com.np')) {
      throw new Error('eSewa returned an untrusted payment address.');
    }
    onOrderCreated(orderId);
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action.toString();
    Object.entries(payload.fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    });
    document.body.append(form);
    form.submit();
    return;
  }

  if (typeof payload.paymentUrl !== 'string') {
    throw new Error('Khalti did not return a payment address.');
  }
  const paymentUrl = new URL(payload.paymentUrl);
  if (paymentUrl.protocol !== 'https:' || !belongsToProvider(paymentUrl.hostname, 'khalti.com')) {
    throw new Error('Khalti returned an untrusted payment address.');
  }
  onOrderCreated(orderId);
  window.location.assign(paymentUrl.toString());
}
