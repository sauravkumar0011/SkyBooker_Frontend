import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-oauth-success',
  templateUrl: './oauth-success.component.html',
  styleUrls: ['./oauth-success.component.css']
})
export class OAuthSuccessComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const fragmentParams = new URLSearchParams(this.route.snapshot.fragment || window.location.hash.replace(/^#/, ''));
    const token = queryParams.get('token') || fragmentParams.get('token');
    const error = queryParams.get('error') || fragmentParams.get('error');
    const successMessage = queryParams.get('message') || fragmentParams.get('message') || 'Google sign-in successful. Redirecting...';
    const fullName = queryParams.get('name')
      || fragmentParams.get('name')
      || queryParams.get('fullName')
      || fragmentParams.get('fullName')
      || '';

    if (error) {
      this.toast.error(error);
      this.router.navigate(['/login']);
      return;
    }

    if (!token) {
      this.toast.error('OAuth login did not return a token.');
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.auth.completeOAuthLogin({
        token,
        userId: queryParams.get('userId') || fragmentParams.get('userId') || '',
        email: queryParams.get('email') || fragmentParams.get('email') || '',
        fullName,
        role: queryParams.get('role') || fragmentParams.get('role') || '',
        provider: queryParams.get('provider') || fragmentParams.get('provider') || undefined,
        profileComplete: this.toBoolean(queryParams.get('profileComplete') || fragmentParams.get('profileComplete')),
        message: queryParams.get('message') || fragmentParams.get('message') || undefined
      });
      this.toast.success(successMessage);

      const returnUrl = this.auth.isPassenger() ? this.auth.consumeOAuthReturnUrl() : '';
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
        return;
      }

      this.auth.consumeOAuthReturnUrl();
      this.auth.redirectByRole();
    } catch {
      this.toast.error('OAuth login could not be completed.');
      this.auth.logout();
    }
  }

  private toBoolean(value: string | null): boolean | undefined {
    if (value == null || value === '') {
      return undefined;
    }

    return value.toLowerCase() === 'true';
  }
}
