import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiBaseUrl;
  private googleOAuthStartUrl = environment.googleOAuthStartUrl;
  private readonly oauthReturnUrlKey = 'oauthReturnUrl';
  private readonly profileCompleteKey = 'profileComplete';
  private readonly providerKey = 'provider';

  constructor(private http: HttpClient, private router: Router) {}

  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.base}/auth/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, data).pipe(
      tap(res => this.persistSession(res))
    );
  }

  forgotPassword(email: string): Observable<string> {
    return this.http.post(
      `${this.base}/auth/forgot-password/otp`,
      { email: email.trim() },
      { responseType: 'text' }
    );
  }

  verifyOtp(email: string, otp: string): Observable<string> {
    return this.http.post(
      `${this.base}/auth/forgot-password/verify-otp`,
      {
        email: email.trim(),
        otp
      },
      { responseType: 'text' }
    );
  }

  resetPassword(email: string, newPassword: string): Observable<string> {
    return this.http.post(
      `${this.base}/auth/forgot-password/reset`,
      {
        email: email.trim(),
        newPassword
      },
      { responseType: 'text' }
    );
  }

  startGoogleLogin(returnUrl = ''): void {
    if (returnUrl) localStorage.setItem(this.oauthReturnUrlKey, returnUrl);
    else localStorage.removeItem(this.oauthReturnUrlKey);

    window.location.href = this.googleOAuthStartUrl;
  }

  completeOAuthLogin(payload: Partial<AuthResponse> & { token: string }): void {
    const session = this.normalizeOAuthPayload(payload);
    this.persistSession(session);
  }

  consumeOAuthReturnUrl(): string {
    const returnUrl = localStorage.getItem(this.oauthReturnUrlKey) || '';
    localStorage.removeItem(this.oauthReturnUrlKey);
    return returnUrl;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): string {
    return localStorage.getItem('userId') || '';
  }

  getUserIdValue(): string {
    return localStorage.getItem('userId') || '';
  }

  getRole(): string {
    return localStorage.getItem('role') || '';
  }

  getFullName(): string {
    return localStorage.getItem('fullName') || '';
  }

  getEmail(): string {
    return localStorage.getItem('email') || '';
  }

  getAirlineId(): string {
    return localStorage.getItem('airlineId') || '';
  }

  isProfileComplete(): boolean {
    return localStorage.getItem(this.profileCompleteKey) === 'true';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isPassenger(): boolean { return this.getRole() === 'PASSENGER'; }
  isStaff(): boolean { return this.getRole() === 'AIRLINE_STAFF'; }
  isAdmin(): boolean { return this.getRole() === 'ADMIN'; }

  redirectByRole(): void {
    const role = this.getRole();
    if (role === 'PASSENGER') this.router.navigate(['/passenger/dashboard']);
    else if (role === 'AIRLINE_STAFF') this.router.navigate(['/staff/dashboard']);
    else if (role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
    else this.router.navigate(['/']);
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('userId', String(res.userId || ''));
    localStorage.setItem('role', res.role || '');
    localStorage.setItem('email', res.email || '');
    localStorage.setItem('fullName', res.fullName || '');
    localStorage.setItem(this.profileCompleteKey, String(this.coerceBoolean(res.profileComplete, true)));

    if (res.airlineId) localStorage.setItem('airlineId', res.airlineId);
    else localStorage.removeItem('airlineId');

    if (res.provider) localStorage.setItem(this.providerKey, res.provider);
    else localStorage.removeItem(this.providerKey);
  }

  private normalizeOAuthPayload(payload: Partial<AuthResponse> & { token: string }): AuthResponse {
    const claims = this.decodeJwtClaims(payload.token);
    const sessionFromToken = this.buildSessionFromToken(payload.token, claims);

    return {
      ...sessionFromToken,
      userId: String(payload.userId || sessionFromToken.userId || ''),
      role: String(payload.role || sessionFromToken.role || ''),
      email: String(payload.email || sessionFromToken.email || ''),
      fullName: String(payload.fullName || sessionFromToken.fullName || ''),
      airlineId: payload.airlineId || sessionFromToken.airlineId,
      provider: payload.provider || undefined,
      profileComplete: this.coerceBoolean(payload.profileComplete, sessionFromToken.profileComplete)
    };
  }

  private buildSessionFromToken(token: string, claims: Record<string, any>): AuthResponse {
    const role = this.extractRole(claims);
    const userId = this.extractUserId(claims);
    const email = this.extractEmail(claims);
    const fullName = this.extractFullName(claims);
    const airlineId = this.extractStringClaim(claims, ['airlineId', 'airline_id']);

    return {
      token,
      userId,
      role,
      email,
      fullName,
      airlineId: airlineId || undefined,
      profileComplete: true
    };
  }

  private decodeJwtClaims(token: string): Record<string, any> {
    const [, payload = ''] = token.split('.');
    if (!payload) throw new Error('Invalid OAuth token.');

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    const decoded = atob(padded);

    return JSON.parse(decoded);
  }

  private extractRole(claims: Record<string, any>): string {
    const directRole = this.extractStringClaim(claims, ['role', 'roles', 'authority', 'authorities']);
    if (!directRole) return '';

    const normalizedRole = directRole.startsWith('ROLE_') ? directRole.slice(5) : directRole;
    if (normalizedRole === 'STAFF') return 'AIRLINE_STAFF';
    return normalizedRole;
  }

  private extractUserId(claims: Record<string, any>): string {
    const explicitId = this.extractStringClaim(claims, ['userId', 'user_id', 'uid', 'id']);
    if (explicitId) return explicitId;

    const subject = this.extractStringClaim(claims, ['sub']);
    return subject.includes('@') ? '' : subject;
  }

  private extractEmail(claims: Record<string, any>): string {
    const explicitEmail = this.extractStringClaim(claims, ['email', 'preferred_username', 'upn']);
    if (explicitEmail) return explicitEmail;

    const subject = this.extractStringClaim(claims, ['sub']);
    return subject.includes('@') ? subject : '';
  }

  private extractFullName(claims: Record<string, any>): string {
    const fullName = this.extractStringClaim(claims, ['fullName', 'full_name', 'name']);
    if (fullName) return fullName;

    const givenName = this.extractStringClaim(claims, ['given_name', 'givenName']);
    const familyName = this.extractStringClaim(claims, ['family_name', 'familyName']);

    return `${givenName} ${familyName}`.trim();
  }

  private extractStringClaim(claims: Record<string, any>, keys: string[]): string {
    for (const key of keys) {
      const value = claims[key];

      if (typeof value === 'string' && value.trim()) return value.trim();
      if (Array.isArray(value)) {
        const firstString = value.find(item => typeof item === 'string' && item.trim());
        if (firstString) return firstString.trim();
      }
    }

    return '';
  }

  private coerceBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return fallback;
  }
}
