import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'isPassenger',
      'redirectByRole',
      'startGoogleLogin',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    activatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({ returnUrl: '/passenger/booking?flightId=F1' })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with the returnUrl from the route', () => {
    expect(component.returnUrl).toBe('/passenger/booking?flightId=F1');
  });

  it('should mark all controls touched and skip submit when the form is invalid', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(authService.login).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should login, show a success toast, and redirect passengers to the returnUrl', () => {
    authService.login.and.returnValue(of({ token: 'token-1' } as any));
    authService.isPassenger.and.returnValue(true);
    component.form.setValue({
      email: 'traveler@example.com',
      password: 'secret1'
    });

    component.onSubmit();

    expect(component.loading).toBeTrue();
    expect(authService.login).toHaveBeenCalledWith({
      email: 'traveler@example.com',
      password: 'secret1'
    });
    expect(toast.success).toHaveBeenCalledWith('Welcome back! Redirecting...');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/passenger/booking?flightId=F1');
    expect(authService.redirectByRole).not.toHaveBeenCalled();
  });

  it('should delegate to role-based navigation when there is no passenger returnUrl', () => {
    activatedRoute.snapshot.queryParamMap = convertToParamMap({});
    authService.login.and.returnValue(of({ token: 'token-2' } as any));
    authService.isPassenger.and.returnValue(false);
    component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({
      email: 'admin@example.com',
      password: 'secret1'
    });

    component.onSubmit();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(authService.redirectByRole).toHaveBeenCalled();
  });

  it('should reset loading when login fails', () => {
    authService.login.and.returnValue(throwError(() => new Error('invalid credentials')));
    component.form.setValue({
      email: 'traveler@example.com',
      password: 'secret1'
    });

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should start Google login with the stored returnUrl', () => {
    component.continueWithGoogle();

    expect(component.oauthLoading).toBeTrue();
    expect(authService.startGoogleLogin).toHaveBeenCalledWith('/passenger/booking?flightId=F1');
  });
});
