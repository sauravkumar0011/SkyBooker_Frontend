import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = `${environment.apiBaseUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/recipient/${userId}`);
  }

  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.base}/${notificationId}/read`, {});
  }

  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.base}/recipient/${userId}/unread-count`);
  }

  markAllRead(userId: string): Observable<string> {
    return this.http.put(`${this.base}/recipient/${userId}/read-all`, {}, { responseType: 'text' });
  }

  deleteNotification(notificationId: string): Observable<string> {
    return this.http.delete(`${this.base}/${notificationId}`, { responseType: 'text' });
  }
}
