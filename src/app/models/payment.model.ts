export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentMode = 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET';

export interface Payment {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMode: PaymentMode | string;
  paymentMethod?: string;
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayKey?: string;
  gatewayResponse?: string;
  initiatedAt?: string;
  paidAt?: string;
  processedAt?: string;
  refundedAt?: string;
  refundAmount?: number;
}

export interface PaymentInitiateRequest {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMode: PaymentMode | string;
  contactEmail: string;
}

export interface PaymentInitiateResponse extends Payment {
  razorpayOrderId: string;
  razorpayKey: string;
}

export interface PaymentProcessRequest {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  gatewayResponse: string;
  success: boolean;
}
