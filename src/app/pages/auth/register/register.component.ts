import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { RegisterRequest } from '../../../models';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private readonly passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=]).*$/;
  private readonly passportPattern = /^[A-Z0-9]{6,9}$/;
  private readonly defaultRole: RegisterRequest['role'] = 'PASSENGER';

  form: FormGroup;
  loading = false;
  showPassword = false;
  returnUrl = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService
  ) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(this.passwordPattern)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
      passportNumber: ['', [Validators.pattern(this.passportPattern)]],
      nationality: [''],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.auth.register(this.buildPayload()).subscribe({
      next: () => {
        this.toast.success('Account created! Please sign in.');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigate(['/login'], {
          queryParams: returnUrl ? { returnUrl } : undefined
        });
      },
      error: () => { this.loading = false; }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${this.getFieldLabel(controlName)} is required`;
    }

    if (controlName === 'email' && control.errors['email']) {
      return 'Enter a valid email address';
    }

    if (controlName === 'password') {
      if (control.errors['minlength']) {
        return 'Password must be at least 8 characters';
      }
      if (control.errors['pattern']) {
        return 'Password must contain uppercase, lowercase, number and special character';
      }
    }

    if (controlName === 'phone' && control.errors['pattern']) {
      return 'Enter a valid phone number';
    }

    if (controlName === 'passportNumber' && control.errors['pattern']) {
      return 'Invalid passport number';
    }

    return 'Invalid value';
  }

  private buildPayload(): RegisterRequest {
    const raw = this.form.getRawValue();

    return {
      fullName: raw.fullName.trim(),
      email: raw.email.trim(),
      password: raw.password,
      phone: raw.phone.trim(),
      role: this.defaultRole,
      passportNumber: this.normalizeOptional(raw.passportNumber)?.toUpperCase() ?? null,
      nationality: this.normalizeOptional(raw.nationality)
    };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private getFieldLabel(controlName: string): string {
    switch (controlName) {
      case 'fullName':
        return 'Full name';
      case 'email':
        return 'Email';
      case 'password':
        return 'Password';
      case 'phone':
        return 'Phone number';
      case 'passportNumber':
        return 'Passport number';
      case 'nationality':
        return 'Nationality';
      default:
        return 'This field';
    }
  }
}
