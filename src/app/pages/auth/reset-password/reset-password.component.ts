import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!newPassword || !confirmPassword) {
    return null;
  }

  return newPassword === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['../login/login.component.css', './reset-password.component.css']
})
export class ResetPasswordComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  email = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });

    this.email = (this.route.snapshot.queryParamMap.get('email') || '').trim();

    if (!this.email) {
      this.toast.info('Start with your email to reset your password.');
      this.router.navigate(['/forgot-password']);
      return;
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const newPassword = this.form.getRawValue().newPassword;

    this.auth.resetPassword(this.email, newPassword).subscribe({
      next: () => {
        this.toast.success('Password reset successfully. Please sign in.');
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
