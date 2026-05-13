import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function createJwt(payload: Record<string, unknown>): string {
    const encode = (value: Record<string, unknown>) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
  }

  it('should post registration data to the register endpoint', () => {
    const payload = {
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'Secret@123',
      phone: '+911234567890',
      role: 'PASSENGER',
      passportNumber: null,
      nationality: null
    } as any;

    service.register(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should login and persist the session in localStorage', () => {
    const response = {
      token: 'token-123',
      userId: '42',
      role: 'PASSENGER',
      email: 'user@example.com',
      fullName: 'Test User',
      airlineId: 'air-1',
      profileComplete: false,
      provider: 'local'
    };

    service.login({ email: 'user@example.com', password: 'Secret@123' }).subscribe(res => {
      expect(res).toEqual(response as any);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(localStorage.getItem('token')).toBe('token-123');
    expect(localStorage.getItem('userId')).toBe('42');
    expect(localStorage.getItem('role')).toBe('PASSENGER');
    expect(localStorage.getItem('email')).toBe('user@example.com');
    expect(localStorage.getItem('fullName')).toBe('Test User');
    expect(localStorage.getItem('airlineId')).toBe('air-1');
    expect(localStorage.getItem('profileComplete')).toBe('false');
    expect(localStorage.getItem('provider')).toBe('local');
  });

  it('should trim email when requesting forgot password and verifying OTP', () => {
    service.forgotPassword('  user@example.com ').subscribe();
    let req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password/otp`);
    expect(req.request.body).toEqual({ email: 'user@example.com' });
    expect(req.request.responseType).toBe('text');
    req.flush('OTP sent');

    service.verifyOtp('  user@example.com ', '123456').subscribe();
    req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password/verify-otp`);
    expect(req.request.body).toEqual({ email: 'user@example.com', otp: '123456' });
    expect(req.request.responseType).toBe('text');
    req.flush('OTP verified');
  });

  it('should trim email when resetting password', () => {
    service.resetPassword('  user@example.com ', 'NewSecret@123').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password/reset`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'user@example.com',
      newPassword: 'NewSecret@123'
    });
    expect(req.request.responseType).toBe('text');
    req.flush('Password reset');
  });

  it('should complete OAuth login by normalizing token claims and storing the session', () => {
    const token = createJwt({
      roles: ['ROLE_STAFF'],
      sub: 'staff@example.com',
      name: 'Sky Staff',
      airline_id: 'air-77'
    });

    service.completeOAuthLogin({
      token,
      provider: 'google',
      profileComplete: 'false'
    } as any);

    expect(localStorage.getItem('token')).toBe(token);
    expect(localStorage.getItem('role')).toBe('AIRLINE_STAFF');
    expect(localStorage.getItem('email')).toBe('staff@example.com');
    expect(localStorage.getItem('fullName')).toBe('Sky Staff');
    expect(localStorage.getItem('airlineId')).toBe('air-77');
    expect(localStorage.getItem('profileComplete')).toBe('false');
    expect(localStorage.getItem('provider')).toBe('google');
  });

  it('should throw when OAuth token payload is missing', () => {
    expect(() => service.completeOAuthLogin({ token: 'invalid-token' } as any)).toThrowError('Invalid OAuth token.');
  });

  it('should consume and clear the stored OAuth returnUrl', () => {
    localStorage.setItem('oauthReturnUrl', '/passenger/payment/1');

    expect(service.consumeOAuthReturnUrl()).toBe('/passenger/payment/1');
    expect(localStorage.getItem('oauthReturnUrl')).toBeNull();
  });

  it('should clear the session and navigate to login on logout', () => {
    localStorage.setItem('token', 'token-123');

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should expose helper getters and login status from localStorage', () => {
    localStorage.setItem('token', 'token-123');
    localStorage.setItem('userId', '42');
    localStorage.setItem('role', 'ADMIN');
    localStorage.setItem('email', 'admin@example.com');
    localStorage.setItem('fullName', 'Admin User');
    localStorage.setItem('airlineId', 'air-9');
    localStorage.setItem('profileComplete', 'true');

    expect(service.getToken()).toBe('token-123');
    expect(service.getUserId()).toBe('42');
    expect(service.getUserIdValue()).toBe('42');
    expect(service.getRole()).toBe('ADMIN');
    expect(service.getEmail()).toBe('admin@example.com');
    expect(service.getFullName()).toBe('Admin User');
    expect(service.getAirlineId()).toBe('air-9');
    expect(service.isProfileComplete()).toBeTrue();
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.isPassenger()).toBeFalse();
    expect(service.isStaff()).toBeFalse();
    expect(service.isAdmin()).toBeTrue();
  });

  it('should redirect users to the correct dashboard based on role', () => {
    localStorage.setItem('role', 'PASSENGER');
    service.redirectByRole();
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/dashboard']);

    router.navigate.calls.reset();
    localStorage.setItem('role', 'AIRLINE_STAFF');
    service.redirectByRole();
    expect(router.navigate).toHaveBeenCalledWith(['/staff/dashboard']);

    router.navigate.calls.reset();
    localStorage.setItem('role', 'ADMIN');
    service.redirectByRole();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);

    router.navigate.calls.reset();
    localStorage.removeItem('role');
    service.redirectByRole();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
