import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PassengerDashboardComponent } from './dashboard.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('PassengerDashboardComponent', () => {
  const context = createComponentTestContext();

  beforeEach(async () => {
    context.bookingService.getBookingsByUser.and.returnValue(of([] as any));
    await configureComponentTest(PassengerDashboardComponent, context);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PassengerDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should exclude pending bookings from dashboard totals and recent bookings', () => {
    context.bookingService.getBookingsByUser.and.returnValue(of([
      { bookingId: 'booking-1', flightId: 'flight-1', status: 'CONFIRMED' },
      { bookingId: 'booking-2', flightId: 'flight-1', status: 'CANCELLED' },
      { bookingId: 'booking-3', flightId: 'flight-1', status: 'PENDING' },
    ] as any));

    const fixture = TestBed.createComponent(PassengerDashboardComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.bookings.map(booking => booking.bookingId)).toEqual(['booking-1', 'booking-2']);
  });
});
