import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { JwtInterceptor } from './jwt.interceptor';

describe('JwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'logout']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    auth.getToken.and.returnValue('jwt-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach the bearer token to protected requests', () => {
    http.get('/flights/42').subscribe();

    const req = httpMock.expectOne('/flights/42');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('should not attach the bearer token to public auth endpoints', () => {
    http.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not attach the bearer token to public booking retrieval endpoints', () => {
    http.get('/bookings/pnr/SKY123').subscribe();

    const req = httpMock.expectOne('/bookings/pnr/SKY123');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should logout and show a toast on 401 responses', () => {
    let actualStatus: number | undefined;

    http.get('/secure').subscribe({
      error: error => actualStatus = error.status
    });

    const req = httpMock.expectOne('/secure');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(actualStatus).toBe(401);
    expect(auth.logout).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Session expired. Please login again.');
  });

  it('should show a permissions toast on 403 responses', () => {
    http.get('/secure').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/secure');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Access denied. Insufficient permissions.');
  });

  it('should show a network toast when the backend is unreachable', () => {
    http.get('/secure').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/secure');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(toast.error).toHaveBeenCalledWith('Cannot connect to server. Please check your connection.');
  });

  it('should prefer the backend message for other server errors', () => {
    http.get('/secure').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/secure');
    req.flush({ message: 'Something specific broke.' }, { status: 500, statusText: 'Server Error' });

    expect(toast.error).toHaveBeenCalledWith('Something specific broke.');
  });
});
