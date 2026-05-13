import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard, RoleGuard, GuestGuard } from './core/guards/auth.guard';

// Public
import { HomeComponent } from './pages/home/home.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { VerifyOtpComponent } from './pages/auth/verify-otp/verify-otp.component';
import { OAuthSuccessComponent } from './pages/auth/oauth-success/oauth-success.component';
import { RetrieveBookingComponent } from './pages/passenger/retrieve-booking/retrieve-booking.component';

// Passenger
import { PassengerDashboardComponent } from './pages/passenger/dashboard/dashboard.component';
import { FlightSearchComponent } from './pages/passenger/flight-search/flight-search.component';
import { FlightDetailsComponent } from './pages/passenger/flight-details/flight-details.component';
import { SeatMapComponent } from './pages/passenger/seat-map/seat-map.component';
import { BookingComponent } from './pages/passenger/booking/booking.component';
import { PassengerDetailsComponent } from './pages/passenger/passenger-details/passenger-details.component';
import { PaymentComponent } from './pages/passenger/payment/payment.component';
import { MyBookingsComponent } from './pages/passenger/my-bookings/my-bookings.component';
import { NotificationsComponent } from './pages/passenger/notifications/notifications.component';

// Staff
import { StaffDashboardComponent } from './pages/staff/dashboard/staff-dashboard.component';
import { AddFlightComponent } from './pages/staff/add-flight/add-flight.component';
import { ManageFlightsComponent } from './pages/staff/manage-flights/manage-flights.component';
import { ManageSeatsComponent } from './pages/staff/manage-seats/manage-seats.component';
import { PassengerManifestComponent } from './pages/staff/passenger-manifest/passenger-manifest.component';

// Admin
import { AdminDashboardComponent } from './pages/admin/dashboard/admin-dashboard.component';
import { ManageAirlinesComponent } from './pages/admin/manage-airlines/manage-airlines.component';
import { ManageAirportsComponent } from './pages/admin/manage-airports/manage-airports.component';
import { ManageStaffComponent } from './pages/admin/manage-staff/manage-staff.component';
import { PaymentsAdminComponent } from './pages/admin/payments-admin/payments-admin.component';

const routes: Routes = [
  // ── Public ──────────────────────────────────────────────
  { path: '', component: HomeComponent },
  { path: 'forgot-password',  component: ForgotPasswordComponent },
  { path: 'login',            component: LoginComponent },
  { path: 'register',         component: RegisterComponent },
  { path: 'reset-password',   component: ResetPasswordComponent },
  { path: 'verify-otp',       component: VerifyOtpComponent },
  { path: 'oauth-success',    component: OAuthSuccessComponent },
  { path: 'oauth2/redirect',  component: OAuthSuccessComponent },
  { path: 'retrieve-booking', component: RetrieveBookingComponent },

  // ── Passenger ───────────────────────────────────────────
  {
    path: 'passenger',
    children: [
      { path: 'flights',            component: FlightSearchComponent },
      { path: 'flight/:id',         component: FlightDetailsComponent },
      { path: 'seats/:flightId',    component: SeatMapComponent },
      { path: 'dashboard',          component: PassengerDashboardComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'booking',            component: BookingComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'passenger-details',  component: PassengerDetailsComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'payment/:bookingId', component: PaymentComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'payment',            component: PaymentComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'my-bookings',        component: MyBookingsComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: 'notifications',      component: NotificationsComponent, canActivate: [RoleGuard], data: { roles: ['PASSENGER'] } },
      { path: '', redirectTo: 'flights', pathMatch: 'full' },
    ]
  },

  // ── Staff ────────────────────────────────────────────────
  {
    path: 'staff',
    canActivate: [RoleGuard],
    data: { roles: ['AIRLINE_STAFF'] },
    children: [
      { path: 'dashboard',  component: StaffDashboardComponent },
      { path: 'add-flight', component: AddFlightComponent },
      { path: 'flights',    component: ManageFlightsComponent },
      { path: 'seats',      component: ManageSeatsComponent },
      { path: 'manifest',   component: PassengerManifestComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // ── Admin ────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [RoleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'airlines',  component: ManageAirlinesComponent },
      { path: 'airports',  component: ManageAirportsComponent },
      { path: 'staff',     component: ManageStaffComponent },
      { path: 'payments',  component: PaymentsAdminComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // ── Fallback ─────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
