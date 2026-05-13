import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  oauthLoading = false;
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
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.auth.login(this.form.value).subscribe({
      next: () => {
        this.toast.success('Welcome back! Redirecting...');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (this.auth.isPassenger() && returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }

        this.auth.redirectByRole();
      },
      error: () => { this.loading = false; }
    });
  }

  continueWithGoogle(): void {
    this.oauthLoading = true;
    this.auth.startGoogleLogin(this.returnUrl);
  }
}
