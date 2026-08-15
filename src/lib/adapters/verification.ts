export interface VerificationStartResult {
  providerSessionId: string;
  redirectUrl?: string;
}

export interface VerificationResult {
  status: 'verified' | 'rejected' | 'pending' | 'error';
  confidence?: number;
  reasonCode?: string;
}

export interface VerificationProvider {
  start(userId: string): Promise<VerificationStartResult>;
  getResult(providerSessionId: string): Promise<VerificationResult>;
}

export class MockVerificationProvider implements VerificationProvider {
  async start(userId: string): Promise<VerificationStartResult> {
    return { providerSessionId: `mock-${userId}-${Date.now()}` };
  }

  async getResult(): Promise<VerificationResult> {
    return { status: 'pending' };
  }
}
