import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SUPPRESS_GLOBAL_ERROR_TOAST } from '../interceptors/http-context-tokens';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/payments`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initiate a payment', () => {
    const payload = {
      bookingId: 'booking-1',
      userId: 'user-1',
      amount: 6372,
      currency: 'INR',
      paymentMode: 'UPI'
    } as any;

    service.initiatePayment(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/initiate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ paymentId: 'payment-1' });
  });

  it('should process a payment confirmation payload', () => {
    const payload = {
      paymentId: 'payment-1',
      razorpayOrderId: 'order-1',
      razorpayPaymentId: 'pay-1',
      razorpaySignature: 'sig-1',
      gatewayResponse: '{}',
      success: true
    } as any;

    service.processPayment(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/process`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeFalse();
    req.flush({ paymentId: 'payment-1', status: 'PAID' });
  });

  it('should allow process payment requests to suppress global error toasts', () => {
    const payload = {
      paymentId: 'payment-1',
      razorpayOrderId: 'order-1',
      razorpayPaymentId: '',
      razorpaySignature: '',
      gatewayResponse: '{}',
      success: false
    } as any;

    service.processPayment(payload, { suppressHandledErrorToast: true }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/process`);
    expect(req.request.method).toBe('POST');
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({ paymentId: 'payment-1', status: 'FAILED' });
  });

  it('should fetch payment status by payment id', () => {
    service.getPaymentStatus('payment-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/payment-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ paymentId: 'payment-1' });
  });

  it('should fetch payment details by booking id', () => {
    service.getPaymentByBooking('booking-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/booking/booking-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ paymentId: 'payment-1' });
  });

  it('should fetch payments filtered by status', () => {
    service.getPaymentsByStatus('PAID').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/status/PAID`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch the revenue report with query params', () => {
    service.getRevenue('2026-05-01', '2026-05-31').subscribe();

    const req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/revenue`
      && request.params.get('start') === '2026-05-01'
      && request.params.get('end') === '2026-05-31'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ totalRevenue: 99999 });
  });

  it('should propagate backend errors to subscribers', () => {
    let actualStatus: number | undefined;

    service.getPaymentStatus('payment-404').subscribe({
      error: error => actualStatus = error.status
    });

    const req = httpMock.expectOne(`${baseUrl}/payment-404`);
    req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });

    expect(actualStatus).toBe(404);
  });
});
