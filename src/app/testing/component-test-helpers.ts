import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { AirlineAirportService } from '../core/services/airline-airport.service';
import { AuthService } from '../core/services/auth.service';
import { BookingService } from '../core/services/booking.service';
import { FlightService } from '../core/services/flight.service';
import { NotificationService } from '../core/services/notification.service';
import { PassengerService } from '../core/services/passenger.service';
import { PaymentService } from '../core/services/payment.service';
import { SeatService } from '../core/services/seat.service';
import { Toast, ToastService } from '../core/services/toast.service';
import { UserManagementService } from '../core/services/user-management.service';

type ToastServiceMock = jasmine.SpyObj<ToastService> & { toasts$: Observable<Toast> };

export interface ComponentTestContext {
  activatedRoute: ActivatedRoute;
  router: Router;
  authService: jasmine.SpyObj<AuthService>;
  bookingService: jasmine.SpyObj<BookingService>;
  flightService: jasmine.SpyObj<FlightService>;
  seatService: jasmine.SpyObj<SeatService>;
  paymentService: jasmine.SpyObj<PaymentService>;
  passengerService: jasmine.SpyObj<PassengerService>;
  notificationService: jasmine.SpyObj<NotificationService>;
  airlineAirportService: jasmine.SpyObj<AirlineAirportService>;
  userManagementService: jasmine.SpyObj<UserManagementService>;
  toastService: ToastServiceMock;
  toastStream: Subject<Toast>;
}

export function createComponentTestContext(): ComponentTestContext {
  const toastStream = new Subject<Toast>();

  const router = {
    url: '/',
    navigate: jasmine.createSpy('navigate'),
    navigateByUrl: jasmine.createSpy('navigateByUrl'),
    getCurrentNavigation: jasmine.createSpy('getCurrentNavigation').and.returnValue(null),
  } as unknown as Router;

  const routeParams = {
    id: 'flight-1',
    flightId: 'flight-1',
    bookingId: 'booking-1',
  };

  const queryParams = {
    bookingId: 'booking-1',
    departureDate: '2026-05-07',
    destination: 'BOM',
    email: 'user@example.com',
    flightId: 'flight-1',
    fullName: 'Test User',
    origin: 'DEL',
    returnUrl: '/passenger/flights',
    role: 'PASSENGER',
    seatId: 'seat-1',
    token: 'test-oauth-token',
    userId: 'user-1',
  };

  const activatedRoute = {
    snapshot: {
      paramMap: convertToParamMap(routeParams),
      queryParamMap: convertToParamMap(queryParams),
      fragment: '',
    },
    paramMap: of(convertToParamMap(routeParams)),
    queryParamMap: of(convertToParamMap(queryParams)),
    queryParams: of(queryParams),
  } as unknown as ActivatedRoute;

  const authService = jasmine.createSpyObj<AuthService>('AuthService', [
    'register',
    'login',
    'forgotPassword',
    'verifyOtp',
    'resetPassword',
    'startGoogleLogin',
    'completeOAuthLogin',
    'consumeOAuthReturnUrl',
    'logout',
    'getToken',
    'getUserId',
    'getUserIdValue',
    'getRole',
    'getFullName',
    'getEmail',
    'getAirlineId',
    'isProfileComplete',
    'isLoggedIn',
    'isPassenger',
    'isStaff',
    'isAdmin',
    'redirectByRole',
  ]);

  authService.register.and.returnValue(of({}));
  authService.login.and.returnValue(of({ token: 'token', role: 'PASSENGER' } as never));
  authService.forgotPassword.and.returnValue(of('OTP sent'));
  authService.verifyOtp.and.returnValue(of('OTP verified'));
  authService.resetPassword.and.returnValue(of('Password reset'));
  authService.consumeOAuthReturnUrl.and.returnValue('');
  authService.getToken.and.returnValue('token');
  authService.getUserId.and.returnValue('user-1');
  authService.getUserIdValue.and.returnValue('user-1');
  authService.getRole.and.returnValue('PASSENGER');
  authService.getFullName.and.returnValue('Test User');
  authService.getEmail.and.returnValue('user@example.com');
  authService.getAirlineId.and.returnValue('airline-1');
  authService.isProfileComplete.and.returnValue(true);
  authService.isLoggedIn.and.returnValue(true);
  authService.isPassenger.and.returnValue(true);
  authService.isStaff.and.returnValue(false);
  authService.isAdmin.and.returnValue(false);

  const mockFlight = {
    flightId: 'flight-1',
    flightNumber: 'SB101',
    airlineId: 'airline-1',
    originAirportCode: 'DEL',
    destinationAirportCode: 'BOM',
    departureTime: '2026-05-07T08:00:00.000Z',
    arrivalTime: '2026-05-07T10:30:00.000Z',
    aircraftType: 'A320',
    totalSeats: 180,
    availableSeats: 24,
    basePrice: 5400,
    status: 'ON_TIME',
  };

  const mockSeat = {
    seatId: 'seat-1',
    seatNumber: '12A',
    rowNumber: 12,
    columnLetter: 'A',
    seatClass: 'ECONOMY',
    priceMultiplier: 1.1,
    isWindow: true,
    isAisle: false,
    seatStatus: 'AVAILABLE',
    status: 'AVAILABLE',
  };

  const mockBooking = {
    bookingId: 'booking-1',
    userId: 'user-1',
    flightId: 'flight-1',
    seatId: 'seat-1',
    tripType: 'ONE_WAY',
    baseFare: 5400,
    taxes: 972,
    totalFare: 6372,
    luggageKg: 15,
    mealPreference: 'STANDARD',
    status: 'PENDING',
    contactEmail: 'user@example.com',
    contactPhone: '+911234567890',
    pnrCode: 'PNR123',
  };

  const mockPassenger = {
    passengerId: 'passenger-1',
    bookingId: 'booking-1',
    seatId: 'seat-1',
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    passportNumber: 'P1234567',
    nationality: 'INDIAN',
    ticketNumber: 'TKT-1001',
  };

  const mockPayment = {
    paymentId: 'payment-1',
    bookingId: 'booking-1',
    amount: 6372,
    currency: 'INR',
    paymentMode: 'UPI',
    status: 'PAID',
    razorpayOrderId: 'order-1',
    razorpayPaymentId: 'pay-1',
  };

  const mockPaymentInitiation = {
    paymentId: 'payment-1',
    bookingId: 'booking-1',
    amount: 6372,
    currency: 'INR',
    paymentMode: 'UPI',
    razorpayOrderId: 'order-1',
    razorpayKey: 'rzp_test_key',
  };

  const mockNotification = {
    notificationId: 'notification-1',
    recipientUserId: 'user-1',
    title: 'Boarding Reminder',
    message: 'Check in for your flight.',
    isRead: false,
    createdAt: '2026-05-07T07:00:00.000Z',
  };

  const mockAirline = {
    airlineId: 'airline-1',
    name: 'SkyBooker Air',
    iataCode: 'SB',
    icaoCode: 'SKYB',
    country: 'India',
    contactEmail: 'ops@skybooker.test',
    status: 'ACTIVE',
  };

  const mockAirport = {
    airportId: 1,
    name: 'Indira Gandhi International Airport',
    city: 'Delhi',
    country: 'India',
    iataCode: 'DEL',
    icaoCode: 'VIDP',
  };

  const mockStaffUser = {
    userId: 'staff-1',
    fullName: 'Sky Staff',
    email: 'staff@skybooker.test',
    phone: '+911111111111',
    role: 'AIRLINE_STAFF',
    active: true,
  };

  const flightService = jasmine.createSpyObj<FlightService>('FlightService', [
    'searchFlights',
    'getFlightById',
    'getFlightByNumber',
    'getFlightsByAirline',
    'getAllFlights',
    'createFlight',
    'updateFlight',
    'updateFlightStatus',
    'decrementSeats',
    'incrementSeats',
    'deleteFlight',
  ]);
  flightService.searchFlights.and.returnValue(of([mockFlight] as never));
  flightService.getFlightById.and.returnValue(of(mockFlight as never));
  flightService.getFlightByNumber.and.returnValue(of(mockFlight as never));
  flightService.getFlightsByAirline.and.returnValue(of([mockFlight] as never));
  flightService.getAllFlights.and.returnValue(of([mockFlight] as never));
  flightService.createFlight.and.returnValue(of(mockFlight as never));
  flightService.updateFlight.and.returnValue(of(mockFlight as never));
  flightService.updateFlightStatus.and.returnValue(of(mockFlight as never));
  flightService.decrementSeats.and.returnValue(of(mockFlight as never));
  flightService.incrementSeats.and.returnValue(of(mockFlight as never));
  flightService.deleteFlight.and.returnValue(of('Deleted' as never));

  const bookingService = jasmine.createSpyObj<BookingService>('BookingService', [
    'createBooking',
    'calculateFare',
    'getBookingsByUser',
    'getBookingByPnr',
    'getBookingById',
    'confirmBooking',
    'cancelBooking',
  ]);
  bookingService.createBooking.and.returnValue(of(mockBooking as never));
  bookingService.calculateFare.and.returnValue(of({
    baseFare: 5400,
    taxes: 972,
    luggageCharge: 0,
    mealCharge: 0,
    totalFare: 6372,
  } as never));
  bookingService.getBookingsByUser.and.returnValue(of([mockBooking] as never));
  bookingService.getBookingByPnr.and.returnValue(of(mockBooking as never));
  bookingService.getBookingById.and.returnValue(of(mockBooking as never));
  bookingService.confirmBooking.and.returnValue(of({ ...mockBooking, status: 'CONFIRMED' } as never));
  bookingService.cancelBooking.and.returnValue(of({ ...mockBooking, status: 'CANCELLED' } as never));

  const seatService = jasmine.createSpyObj<SeatService>('SeatService', [
    'getSeatMap',
    'getAvailableSeats',
    'getAvailableSeatsByClass',
    'createSeat',
    'createBulkSeats',
    'deleteSeatsForFlight',
    'holdSeat',
    'releaseSeat',
    'confirmSeat',
  ]);
  seatService.getSeatMap.and.returnValue(of([mockSeat] as never));
  seatService.getAvailableSeats.and.returnValue(of([mockSeat] as never));
  seatService.getAvailableSeatsByClass.and.returnValue(of([mockSeat] as never));
  seatService.createSeat.and.returnValue(of(mockSeat as never));
  seatService.createBulkSeats.and.returnValue(of([mockSeat] as never));
  seatService.deleteSeatsForFlight.and.returnValue(of('Deleted' as never));
  seatService.holdSeat.and.returnValue(of(mockSeat as never));
  seatService.releaseSeat.and.returnValue(of({ ...mockSeat, status: 'AVAILABLE' } as never));
  seatService.confirmSeat.and.returnValue(of({ ...mockSeat, status: 'CONFIRMED' } as never));

  const paymentService = jasmine.createSpyObj<PaymentService>('PaymentService', [
    'initiatePayment',
    'processPayment',
    'getPaymentStatus',
    'getPaymentByBooking',
    'getPaymentsByStatus',
    'getRevenue',
  ]);
  paymentService.initiatePayment.and.returnValue(of(mockPaymentInitiation as never));
  paymentService.processPayment.and.returnValue(of(mockPayment as never));
  paymentService.getPaymentStatus.and.returnValue(of(mockPayment as never));
  paymentService.getPaymentByBooking.and.returnValue(of(mockPayment as never));
  paymentService.getPaymentsByStatus.and.returnValue(of([mockPayment] as never));
  paymentService.getRevenue.and.returnValue(of({
    totalRevenue: 6372,
    totalPayments: 1,
  } as never));

  const passengerService = jasmine.createSpyObj<PassengerService>('PassengerService', [
    'createPassenger',
    'getPassengersByBooking',
  ]);
  passengerService.createPassenger.and.returnValue(of(mockPassenger as never));
  passengerService.getPassengersByBooking.and.returnValue(of([mockPassenger] as never));

  const notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', [
    'getNotifications',
    'markAsRead',
    'getUnreadCount',
    'markAllRead',
    'deleteNotification',
  ]);
  notificationService.getNotifications.and.returnValue(of([mockNotification] as never));
  notificationService.markAsRead.and.returnValue(of({ ...mockNotification, isRead: true } as never));
  notificationService.getUnreadCount.and.returnValue(of(1));
  notificationService.markAllRead.and.returnValue(of('Updated' as never));
  notificationService.deleteNotification.and.returnValue(of('Deleted' as never));

  const airlineAirportService = jasmine.createSpyObj<AirlineAirportService>('AirlineAirportService', [
    'getAirlines',
    'createAirline',
    'updateAirline',
    'deactivateAirline',
    'searchAirports',
    'getAirportByIata',
    'createAirport',
    'updateAirport',
  ]);
  airlineAirportService.getAirlines.and.returnValue(of([mockAirline] as never));
  airlineAirportService.createAirline.and.returnValue(of(mockAirline as never));
  airlineAirportService.updateAirline.and.returnValue(of(mockAirline as never));
  airlineAirportService.deactivateAirline.and.returnValue(of({ message: 'Deactivated' } as never));
  airlineAirportService.searchAirports.and.returnValue(of([mockAirport] as never));
  airlineAirportService.getAirportByIata.and.returnValue(of(mockAirport as never));
  airlineAirportService.createAirport.and.returnValue(of(mockAirport as never));
  airlineAirportService.updateAirport.and.returnValue(of(mockAirport as never));

  const userManagementService = jasmine.createSpyObj<UserManagementService>('UserManagementService', [
    'getStaffUsers',
    'createStaff',
    'deactivateUser',
    'deleteUser',
  ]);
  userManagementService.getStaffUsers.and.returnValue(of([mockStaffUser] as never));
  userManagementService.createStaff.and.returnValue(of({} as never));
  userManagementService.deactivateUser.and.returnValue(of('Deactivated' as never));
  userManagementService.deleteUser.and.returnValue(of('Deleted' as never));

  const toastService = jasmine.createSpyObj<ToastService>(
    'ToastService',
    ['show', 'success', 'error', 'warning', 'info'],
    { toasts$: toastStream.asObservable() }
  ) as ToastServiceMock;

  return {
    activatedRoute,
    router,
    authService,
    bookingService,
    flightService,
    seatService,
    paymentService,
    passengerService,
    notificationService,
    airlineAirportService,
    userManagementService,
    toastService,
    toastStream,
  };
}

export async function configureComponentTest<T>(
  component: Type<T>,
  context: ComponentTestContext
): Promise<void> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    declarations: [component],
    imports: [FormsModule, ReactiveFormsModule],
    providers: [
      { provide: ActivatedRoute, useValue: context.activatedRoute },
      { provide: Router, useValue: context.router },
      { provide: AuthService, useValue: context.authService },
      { provide: BookingService, useValue: context.bookingService },
      { provide: FlightService, useValue: context.flightService },
      { provide: SeatService, useValue: context.seatService },
      { provide: PaymentService, useValue: context.paymentService },
      { provide: PassengerService, useValue: context.passengerService },
      { provide: NotificationService, useValue: context.notificationService },
      { provide: AirlineAirportService, useValue: context.airlineAirportService },
      { provide: UserManagementService, useValue: context.userManagementService },
      { provide: ToastService, useValue: context.toastService },
    ],
  });

  TestBed.overrideComponent(component, {
    set: {
      template: '',
    },
  });

  await TestBed.compileComponents();
}
