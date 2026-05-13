import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastService } from '../../../core/services/toast.service';
import { Notification } from '../../../models';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;
  unreadCount = 0;
  markingAllRead = false;
  deletingId: string | null = null;
  deleteTarget: Notification | null = null;

  constructor(
    private notifService: NotificationService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const uid = this.auth.getUserId();
    this.loading = true;

    forkJoin({
      notifications: this.notifService.getNotifications(uid),
      unreadCount: this.notifService.getUnreadCount(uid),
    }).subscribe({
      next: ({ notifications, unreadCount }) => {
        this.notifications = [...notifications].sort(
          (left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime()
        );
        this.unreadCount = Number(unreadCount || 0);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('We could not load your notifications right now.');
      }
    });
  }

  trackByNotificationId(_: number, notification: Notification): string {
    return notification.notificationId;
  }

  markRead(notification: Notification): void {
    if (notification.isRead) return;

    this.notifService.markAsRead(notification.notificationId).subscribe({
      next: updated => {
        notification.isRead = updated.isRead;
        this.calcUnread();
        this.toast.success('Notification marked as read.');
      },
      error: () => {
        this.toast.error('We could not mark this notification as read.');
      }
    });
  }

  markAllRead(): void {
    const uid = this.auth.getUserId();
    if (!uid || this.unreadCount === 0) return;

    this.markingAllRead = true;
    this.notifService.markAllRead(uid).subscribe({
      next: () => {
        this.notifications = this.notifications.map(notification => ({ ...notification, isRead: true }));
        this.unreadCount = 0;
        this.markingAllRead = false;
        this.toast.success('All notifications marked as read.');
      },
      error: () => {
        this.markingAllRead = false;
        this.toast.error('We could not update all notifications right now.');
      }
    });
  }

  openDeleteConfirm(notification: Notification): void {
    this.deleteTarget = notification;
  }

  closeDeleteConfirm(): void {
    if (this.deletingId) return;
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;

    const target = this.deleteTarget;
    this.deletingId = target.notificationId;

    this.notifService.deleteNotification(target.notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(notification => notification.notificationId !== target.notificationId);
        this.calcUnread();
        this.deletingId = null;
        this.deleteTarget = null;
        this.toast.success('Notification deleted.');
      },
      error: () => {
        this.deletingId = null;
        this.toast.error('We could not delete this notification right now.');
      }
    });
  }

  formatMessage(message: string): string {
    return String(message || '')
      .replace(/\s*Transaction ID:\s*/gi, '.\nTransaction ID: ')
      .replace(/\s*\|\s*/g, '\n')
      .replace(/([.?!])\s+(?=[A-Z0-9])/g, '$1\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  getCategoryLabel(notification: Notification): string {
    const text = `${notification.type} ${notification.title} ${notification.message}`.toLowerCase();

    if (text.includes('payment') || text.includes('refund')) return 'Payment';
    if (text.includes('booking') || text.includes('ticket') || text.includes('pnr')) return 'Booking';
    if (text.includes('flight') || text.includes('departure') || text.includes('gate')) return 'Flight';

    return 'Update';
  }

  getCategoryClass(notification: Notification): string {
    const category = this.getCategoryLabel(notification);

    if (category === 'Payment') return 'payment';
    if (category === 'Booking') return 'booking';
    if (category === 'Flight') return 'flight';

    return 'update';
  }

  private calcUnread(): void {
    this.unreadCount = this.notifications.filter(notification => !notification.isRead).length;
  }
}
