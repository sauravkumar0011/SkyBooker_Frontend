import { Component, OnInit } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { FlightService } from '../../../core/services/flight.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Booking, Flight, Notification } from '../../../models';

@Component({
  selector: 'app-passenger-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class PassengerDashboardComponent implements OnInit {
  bookings: Booking[] = [];
  flightLabels: Record<string, string> = {};
  notifications: Notification[] = [];
  unreadCount = 0;
  loadingBookings = true;

  constructor(
    public auth: AuthService,
    private bookingService: BookingService,
    private flightService: FlightService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadBookings();
    this.loadNotifications();
  }

  loadBookings(): void {
    this.bookingService.getBookingsByUser(this.auth.getUserId()).subscribe({
      next: data => {
        this.bookings = data.filter(booking => this.shouldDisplayBooking(booking));
        this.loadingBookings = false;
        this.loadFlightLabels(this.bookings);
      },
      error: () => { this.loadingBookings = false; }
    });
  }

  loadNotifications(): void {
    const uid = this.auth.getUserId();
    this.notifService.getNotifications(uid).subscribe({
      next: data => { this.notifications = data.slice(0, 5); }
    });
    this.notifService.getUnreadCount(uid).subscribe({
      next: count => { this.unreadCount = count; }
    });
  }

  getFlightLabel(booking: Booking): string {
    return this.flightLabels[booking.bookingId] || booking.flightId;
  }

  private loadFlightLabels(bookings: Booking[]): void {
    if (!bookings.length) {
      this.flightLabels = {};
      return;
    }

    const uniqueFlightIds = [...new Set(bookings.map(booking => booking.flightId))];
    const flightRequests = uniqueFlightIds.reduce((acc, flightId) => {
      acc[flightId] = this.flightService.getFlightById(flightId).pipe(catchError(() => of(null)));
      return acc;
    }, {} as Record<string, Observable<Flight | null>>);

    forkJoin(flightRequests).subscribe({
      next: flights => {
        const nextFlightLabels: Record<string, string> = {};

        bookings.forEach(booking => {
          const flight = flights[booking.flightId] as Flight | null;
          nextFlightLabels[booking.bookingId] = flight?.flightNumber || booking.flightId;
        });

        this.flightLabels = nextFlightLabels;
      }
    });
  }

  getDisplayStatus(status: string): string {
    return status === 'PENDING' ? 'CANCELLED' : status;
  }

  getStatusClass(status: string): string {
    if (status === 'PENDING') {
      return 'badge-danger';
    }

    const map: Record<string, string> = {
      PENDING: 'badge-warning', CONFIRMED: 'badge-success',
      CANCELLED: 'badge-danger', COMPLETED: 'badge-info'
    };
    return map[status] || 'badge-default';
  }

  private shouldDisplayBooking(booking: Booking): boolean {
    return booking.status === 'CONFIRMED' || booking.status === 'CANCELLED';
  }
}
