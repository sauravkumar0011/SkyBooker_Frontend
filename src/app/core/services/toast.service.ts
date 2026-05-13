import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new Subject<Toast>();
  toasts$ = this.toastSubject.asObservable();

  show(type: Toast['type'], message: string, duration = 4000): void {
    const id = Math.random().toString(36).slice(2);
    this.toastSubject.next({ id, type, message, duration });
  }

  success(message: string) { this.show('success', message); }
  error(message: string) { this.show('danger', message); }
  warning(message: string) { this.show('warning', message); }
  info(message: string) { this.show('info', message); }
}
