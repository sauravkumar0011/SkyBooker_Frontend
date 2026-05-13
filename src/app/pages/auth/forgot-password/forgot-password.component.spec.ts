import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      declarations: [ForgotPasswordComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should mark all fields touched and skip submission when the form is invalid', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('should trim the email, request an OTP, and navigate to the verify page', () => {
    authService.forgotPassword.and.returnValue(of('OTP sent'));
    component.form.setValue({ email: 'user@example.com' });

    component.onSubmit();

    expect(component.loading).toBeTrue();
    expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(toast.success).toHaveBeenCalledWith('OTP sent to your email.');
    expect(router.navigate).toHaveBeenCalledWith(['/verify-otp'], {
      queryParams: { email: 'user@example.com' }
    });
  });

  it('should reset loading when the OTP request fails', () => {
    authService.forgotPassword.and.returnValue(throwError(() => new Error('request failed')));
    component.form.setValue({ email: 'user@example.com' });

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
