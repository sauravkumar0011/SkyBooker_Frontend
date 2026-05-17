import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Payment,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentProcessRequest,
  RevenueReport,
} from '../../models';
import { SUPPRESS_GLOBAL_ERROR_TOAST } from '../interceptors/http-context-tokens';

type ProcessPaymentOptions = {
  suppressHandledErrorToast?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private base = `${environment.apiBaseUrl}/payments`;

  constructor(private http: HttpClient) {}

  initiatePayment(data: PaymentInitiateRequest): Observable<PaymentInitiateResponse> {
    return this.http.post<PaymentInitiateResponse>(`${this.base}/initiate`, data);
  }

  processPayment(data: PaymentProcessRequest, options?: ProcessPaymentOptions): Observable<Payment> {
    const context = new HttpContext().set(
      SUPPRESS_GLOBAL_ERROR_TOAST,
      Boolean(options?.suppressHandledErrorToast)
    );

    return this.http.post<Payment>(`${this.base}/process`, data, { context });
  }

  getPaymentStatus(paymentId: string): Observable<string> {
    return this.http.get(`${this.base}/${paymentId}/payment-status`, { responseType: 'text' });
  }

  getPaymentByBooking(bookingId: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/booking/${bookingId}`);
  }

  getPaymentsByStatus(status: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/status/${status}`);
  }

  getRevenue(start: string, end: string): Observable<RevenueReport> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<RevenueReport>(`${this.base}/revenue`, { params });
  }
}
