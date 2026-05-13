import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Payment,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentProcessRequest,
  RevenueReport,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private base = `${environment.apiBaseUrl}/payments`;

  constructor(private http: HttpClient) {}

  initiatePayment(data: PaymentInitiateRequest): Observable<PaymentInitiateResponse> {
    return this.http.post<PaymentInitiateResponse>(`${this.base}/initiate`, data);
  }

  processPayment(data: PaymentProcessRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/process`, data);
  }

  getPaymentStatus(paymentId: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/${paymentId}`);
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
