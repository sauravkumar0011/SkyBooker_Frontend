declare global {
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayFailureResponse {
    error: {
      code?: string;
      description?: string;
      source?: string;
      step?: string;
      reason?: string;
      metadata?: {
        order_id?: string;
        payment_id?: string;
      };
    };
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    order_id: string;
    handler: (response: RazorpaySuccessResponse) => void;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
      method?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
      backdrop_color?: string;
    };
    modal?: {
      ondismiss?: () => void;
      backdropclose?: boolean;
      escape?: boolean;
      animation?: boolean;
      confirm_close?: boolean;
    };
  }

  interface RazorpayInstance {
    open(): void;
    close(): void;
    on(event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void): void;
  }

  interface RazorpayConstructor {
    new (options: RazorpayOptions): RazorpayInstance;
  }

  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

export {};
