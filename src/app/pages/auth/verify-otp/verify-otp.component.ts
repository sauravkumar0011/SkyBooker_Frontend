import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-verify-otp',
  templateUrl: './verify-otp.component.html',
  styleUrls: ['../login/login.component.css', './verify-otp.component.css']
})
export class VerifyOtpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  private static readonly RESEND_COOLDOWN_SECONDS = 120;

  email = '';
  otpDigits = Array.from({ length: 6 }, () => '');
  loading = false;
  resendLoading = false;
  cooldownRemaining = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.email = (this.route.snapshot.queryParamMap.get('email') || '').trim();

    if (!this.email) {
      this.toast.info('Enter your email first to receive an OTP.');
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.startCooldownTimer(true);
  }

  ngAfterViewInit(): void {
    this.focusOtpInput(0);
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
  }

  get otpValue(): string {
    return this.otpDigits.join('');
  }

  get isOtpComplete(): boolean {
    return /^\d{6}$/.test(this.otpValue);
  }

  get cooldownLabel(): string {
    const minutes = Math.floor(this.cooldownRemaining / 60).toString().padStart(2, '0');
    const seconds = (this.cooldownRemaining % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/\D/g, '');
    const digit = sanitized ? sanitized[sanitized.length - 1] : '';

    this.otpDigits[index] = digit;
    input.value = digit;

    if (digit && index < this.otpDigits.length - 1) {
      this.focusOtpInput(index + 1);
    }
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.focusOtpInput(index - 1);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusOtpInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < this.otpDigits.length - 1) {
      event.preventDefault();
      this.focusOtpInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedDigits = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) || '';

    if (!pastedDigits) {
      return;
    }

    this.otpDigits = this.otpDigits.map((_, index) => pastedDigits[index] || '');
    this.focusOtpInput(Math.min(pastedDigits.length, this.otpDigits.length - 1));
  }

  verifyOtp(): void {
    if (!this.isOtpComplete) {
      this.toast.warning('Enter the 6-digit OTP.');
      return;
    }

    this.loading = true;
    this.auth.verifyOtp(this.email, this.otpValue).subscribe({
      next: () => {
        this.toast.success('OTP verified. Set your new password.');
        this.router.navigate(['/reset-password'], { queryParams: { email: this.email } });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  resendOtp(): void {
    if (this.cooldownRemaining > 0 || this.resendLoading) {
      return;
    }

    this.resendLoading = true;
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.otpDigits = Array.from({ length: 6 }, () => '');
        this.toast.success('A new OTP has been sent.');
        this.resendLoading = false;
        this.startCooldownTimer(true);
        this.focusOtpInput(0);
      },
      error: () => {
        this.resendLoading = false;
      }
    });
  }

  private focusOtpInput(index: number): void {
    setTimeout(() => {
      const target = this.otpInputs?.get(index)?.nativeElement;
      target?.focus();
      target?.select();
    });
  }

  private startCooldownTimer(resetToFullDuration = false): void {
    this.stopCooldownTimer();
    this.cooldownRemaining = resetToFullDuration
      ? VerifyOtpComponent.RESEND_COOLDOWN_SECONDS
      : this.cooldownRemaining;

    if (this.cooldownRemaining <= 0) {
      return;
    }

    this.cooldownTimer = setInterval(() => {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - 1);

      if (this.cooldownRemaining <= 0) {
        this.stopCooldownTimer();
      }
    }, 1000);
  }

  private stopCooldownTimer(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
