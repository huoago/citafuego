export interface CheckoutRequest {
  userId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, signature: string): Promise<unknown>;
}

export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    return {
      checkoutId: `mock-${request.userId}-${Date.now()}`,
      checkoutUrl: request.successUrl,
    };
  }

  async verifyWebhook(): Promise<unknown> {
    return { provider: 'mock' };
  }
}
