import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;
  let activatedRoute: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    activatedRoute = {
      snapshot: {
        queryParamMap: convertToParamMap({ returnUrl: '/passenger/flights' })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setValidForm(): void {
    component.form.setValue({
      fullName: '  Test User  ',
      email: 'user@example.com',
      password: 'Secret@123',
      phone: '+911234567890',
      passportNumber: 'AB12345',
      nationality: '  India  ',
    });
  }

  it('should mark all controls touched and skip submit when the form is invalid', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('should submit a normalized registration payload and redirect to login with returnUrl', () => {
    authService.register.and.returnValue(of({}));
    setValidForm();

    component.onSubmit();

    expect(component.loading).toBeTrue();
    expect(authService.register).toHaveBeenCalledWith({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'Secret@123',
      phone: '+911234567890',
      role: 'PASSENGER',
      passportNumber: 'AB12345',
      nationality: 'India'
    });
    expect(toast.success).toHaveBeenCalledWith('Account created! Please sign in.');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/passenger/flights' }
    });
  });

  it('should send null for optional blank fields', () => {
    authService.register.and.returnValue(of({}));
    component.form.setValue({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'Secret@123',
      phone: '+911234567890',
      passportNumber: '',
      nationality: '',
    });

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith(jasmine.objectContaining({
      passportNumber: null,
      nationality: null
    }));
  });

  it('should reset loading when registration fails', () => {
    authService.register.and.returnValue(throwError(() => new Error('register failed')));
    setValidForm();

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should return validation messages for invalid controls', () => {
    const email = component.form.get('email');
    email?.setValue('invalid-email');
    email?.markAsTouched();

    const phone = component.form.get('phone');
    phone?.setValue('abc');
    phone?.markAsTouched();

    const passport = component.form.get('passportNumber');
    passport?.setValue('123');
    passport?.markAsTouched();

    expect(component.getErrorMessage('email')).toBe('Enter a valid email address');
    expect(component.getErrorMessage('phone')).toBe('Enter a valid phone number');
    expect(component.getErrorMessage('passportNumber')).toBe('Invalid passport number');
  });

  it('should return password-specific messages for minlength and pattern failures', () => {
    const password = component.form.get('password');
    password?.setValue('Short1!');
    password?.markAsTouched();
    expect(component.getErrorMessage('password')).toBe('Password must be at least 8 characters');

    password?.setValue('lowercaseonly123');
    expect(component.getErrorMessage('password')).toBe(
      'Password must contain uppercase, lowercase, number and special character'
    );
  });
});
