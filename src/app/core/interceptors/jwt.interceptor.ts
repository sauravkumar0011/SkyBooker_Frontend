import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

// Endpoints that do NOT need the Authorization header
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password/',
  '/bookings/pnr/'
];

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private toast: ToastService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    const isPublic = PUBLIC_ENDPOINTS.some(url => req.url.includes(url));

    if (token && !isPublic) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.auth.logout();
          this.toast.error('Session expired. Please login again.');
        } else if (err.status === 403) {
          this.toast.error('Access denied. Insufficient permissions.');
        } else if (err.status === 0) {
          this.toast.error('Cannot connect to server. Please check your connection.');
        } else {
          const message = err.error?.message || err.error?.error || 'Something went wrong.';
          this.toast.error(message);
        }
        return throwError(() => err);
      })
    );
  }
}
