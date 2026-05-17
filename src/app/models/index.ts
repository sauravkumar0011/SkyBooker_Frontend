// â”€â”€â”€ Auth / User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type UserRole = 'PASSENGER' | 'AIRLINE_STAFF' | 'ADMIN';

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  airlineId?: string;
  passportNumber?: string | null;
  nationality?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  role: string;
  email: string;
  fullName: string;
  airlineId?: string;
  provider?: string;
  profileComplete?: boolean;
  message?: string;
}

export interface User {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string;
  passportNumber?: string | null;
  nationality?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  active?: boolean | null;
  createdAt?: string | null;
}

// â”€â”€â”€ Flight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Flight {
  flightId: string;
  flightNumber: string;
  airlineId: string;
  originAirportCode: string;
  destinationAirportCode: string;
  departureTime: string;
  arrivalTime: string;
  aircraftType: string;
  totalSeats: number;
  basePrice: number;
  status: FlightStatus;
  duration?: string;
  availableSeats?: number;
}

export type FlightStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'ARRIVED';

export interface FlightRequest {
  flightNumber: string;
  airlineId: string;
  originAirportCode: string;
  destinationAirportCode: string;
  departureTime: string;
  arrivalTime: string;
  aircraftType: string;
  totalSeats: number;
  basePrice: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
}

// â”€â”€â”€ Seat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Seat {
  seatId: string;
  flightId: string;
  seatNumber: string;
  seatClass: SeatClass;
  status: SeatStatus;
  priceMultiplier: number;
  rowNumber?: number;
  columnLetter?: string;
  isWindow?: boolean;
  isAisle?: boolean;
  extraLegroom?: boolean;
  hasExtraLegroom?: boolean;
}

export type SeatClass = 'ECONOMY' | 'BUSINESS' | 'FIRST';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'CONFIRMED' | 'BLOCKED';

export interface SeatRequest {
  flightId: string;
  seatClass: SeatClass;
  rowNumber: number;
  columnLetter: string;
  seatNumber: string;
  isWindow: boolean;
  isAisle: boolean;
  hasExtraLegroom: boolean;
  priceMultiplier: number;
}

export interface BulkSeatRequest {
  flightId: string;
  seatClass: SeatClass;
  fromRow: number;
  toRow: number;
  seatColumns: string;
  priceMultiplier: number;
  extraLegroom: boolean;
}

// â”€â”€â”€ Booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Booking {
  bookingId: string;
  userId: string;
  flightId: string;
  seatIds: string[];
  pnrCode: string;
  tripType: TripType;
  baseFare: number;
  taxes: number;
  totalFare: number;
  status: BookingStatus;
  totalPassengers: number;
  mealPreference: string;
  luggageKg: number;
  contactEmail: string;
  contactPhone: string;
  bookedAt: string;
}

export type TripType = 'ONE_WAY' | 'ROUND_TRIP';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface BookingRequest {
  userId: string;
  flightId: string;
  seatIds: string[];
  tripType: TripType;
  mealPreference: string;
  luggageKg: number;
  contactEmail: string;
  contactPhone: string;
}

export interface FareSummaryResponse {
  seatIds?: string[];
  baseFare: number;
  taxes: number;
  baggageCharge: number;
  mealCharge: number;
  totalFare: number;
  totalPassengers?: number;
}

// â”€â”€â”€ Passenger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Passenger {
  passengerId: string;
  bookingId: string;
  seatId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  passportNumber?: string | null;
  nationality: string;
  ticketNumber: string;
}

export interface PassengerRequest {
  seatId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  passportNumber?: string | null;
  nationality: string;
}

export interface PassengerCreateRequest extends PassengerRequest {
  bookingId: string;
}

export interface PassengerBulkRequest {
  bookingId: string;
  passengers: PassengerRequest[];
}

// â”€â”€â”€ Notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Notification {
  notificationId: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  relatedBookingId?: string | null;
  isRead: boolean;
  sentAt: string;
}

// â”€â”€â”€ Airline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Airline {
  airlineId: string;
  name: string;
  iataCode: string;
  icaoCode?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  active?: boolean;
}

export interface AirlineRequest {
  name: string;
  iataCode: string;
  icaoCode?: string | null;
  country?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
}

// â”€â”€â”€ Airport â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Airport {
  airportId: number;
  name: string;
  iataCode: string;
  icaoCode?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
}

export interface AirportRequest {
  name: string;
  iataCode: string;
  icaoCode?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
}

// â”€â”€â”€ Revenue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface RevenueReport {
  totalRevenue: number;
  totalTransactions: number;
  startDate: string;
  endDate: string;
}

export * from './payment.model';
