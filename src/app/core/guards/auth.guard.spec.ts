import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthGuard, GuestGuard, RoleGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    guard = new AuthGuard(auth, router);
  });

  it('should allow navigation when the user is logged in', () => {
    auth.isLoggedIn.and.returnValue(true);

    const allowed = guard.canActivate({} as ActivatedRouteSnapshot, { url: '/passenger/dashboard' } as RouterStateSnapshot);

    expect(allowed).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect unauthenticated users to login with the returnUrl', () => {
    auth.isLoggedIn.and.returnValue(false);

    const allowed = guard.canActivate({} as ActivatedRouteSnapshot, { url: '/passenger/payment/1' } as RouterStateSnapshot);

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/passenger/payment/1' }
    });
  });
});

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'getRole', 'redirectByRole']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    guard = new RoleGuard(auth, router);
  });

  it('should redirect to login when the user is not authenticated', () => {
    auth.isLoggedIn.and.returnValue(false);

    const allowed = guard.canActivate(
      { data: { roles: ['PASSENGER'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/passenger/dashboard' } as RouterStateSnapshot
    );

    expect(allowed).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/passenger/dashboard' }
    });
  });

  it('should allow navigation when no roles are configured', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.getRole.and.returnValue('PASSENGER');

    const allowed = guard.canActivate(
      { data: {} } as unknown as ActivatedRouteSnapshot,
      { url: '/public' } as RouterStateSnapshot
    );

    expect(allowed).toBeTrue();
    expect(auth.redirectByRole).not.toHaveBeenCalled();
  });

  it('should allow navigation when the user role matches', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.getRole.and.returnValue('ADMIN');

    const allowed = guard.canActivate(
      { data: { roles: ['ADMIN', 'AIRLINE_STAFF'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/admin/dashboard' } as RouterStateSnapshot
    );

    expect(allowed).toBeTrue();
  });

  it('should redirect by role when the user lacks permission', () => {
    auth.isLoggedIn.and.returnValue(true);
    auth.getRole.and.returnValue('PASSENGER');

    const allowed = guard.canActivate(
      { data: { roles: ['ADMIN'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/admin/dashboard' } as RouterStateSnapshot
    );

    expect(allowed).toBeFalse();
    expect(auth.redirectByRole).toHaveBeenCalled();
  });
});

describe('GuestGuard', () => {
  let guard: GuestGuard;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    guard = new GuestGuard(auth);
  });

  it('should allow guest users', () => {
    auth.isLoggedIn.and.returnValue(false);
    expect(guard.canActivate()).toBeTrue();
  });

  it('should block authenticated users', () => {
    auth.isLoggedIn.and.returnValue(true);
    expect(guard.canActivate()).toBeFalse();
  });
});
