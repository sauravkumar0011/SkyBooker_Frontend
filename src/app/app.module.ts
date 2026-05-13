import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule, TitleCasePipe, LowerCasePipe, DecimalPipe, DatePipe } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';

// ── Root ─────────────────────────────────────────────────
import { AppComponent } from './app.component';

// ── Shared Components ────────────────────────────────────
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { ToastComponent } from './shared/components/toast/toast.component';

// ── Shared Pipes ─────────────────────────────────────────
import { StatusFilterPipe } from './shared/pipes/status-filter.pipe';

// ── Public Pages ─────────────────────────────────────────
import { HomeComponent } from './pages/home/home.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { OAuthSuccessComponent } from './pages/auth/oauth-success/oauth-success.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { VerifyOtpComponent } from './pages/auth/verify-otp/verify-otp.component';
import { RetrieveBookingComponent } from './pages/passenger/retrieve-booking/retrieve-booking.component';

// ── Passenger Pages ──────────────────────────────────────
import { PassengerDashboardComponent } from './pages/passenger/dashboard/dashboard.component';
import { FlightSearchComponent } from './pages/passenger/flight-search/flight-search.component';
import { FlightDetailsComponent } from './pages/passenger/flight-details/flight-details.component';
import { SeatMapComponent } from './pages/passenger/seat-map/seat-map.component';
import { BookingComponent } from './pages/passenger/booking/booking.component';
import { PassengerDetailsComponent } from './pages/passenger/passenger-details/passenger-details.component';
import { PaymentComponent } from './pages/passenger/payment/payment.component';
import { MyBookingsComponent } from './pages/passenger/my-bookings/my-bookings.component';
import { NotificationsComponent } from './pages/passenger/notifications/notifications.component';

// ── Staff Pages ──────────────────────────────────────────
import { StaffDashboardComponent } from './pages/staff/dashboard/staff-dashboard.component';
import { AddFlightComponent } from './pages/staff/add-flight/add-flight.component';
import { ManageFlightsComponent } from './pages/staff/manage-flights/manage-flights.component';
import { ManageSeatsComponent } from './pages/staff/manage-seats/manage-seats.component';
import { PassengerManifestComponent } from './pages/staff/passenger-manifest/passenger-manifest.component';

// ── Admin Pages ───────────────────────────────────────────
import { AdminDashboardComponent } from './pages/admin/dashboard/admin-dashboard.component';
import { ManageAirlinesComponent } from './pages/admin/manage-airlines/manage-airlines.component';
import { ManageAirportsComponent } from './pages/admin/manage-airports/manage-airports.component';
import { ManageStaffComponent } from './pages/admin/manage-staff/manage-staff.component';
import { PaymentsAdminComponent } from './pages/admin/payments-admin/payments-admin.component';

@NgModule({
  declarations: [
    AppComponent,

    // Shared
    NavbarComponent,
    FooterComponent,
    LoadingSpinnerComponent,
    ToastComponent,

    // Pipes
    StatusFilterPipe,

    // Public
    HomeComponent,
    ForgotPasswordComponent,
    LoginComponent,
    OAuthSuccessComponent,
    RegisterComponent,
    ResetPasswordComponent,
    RetrieveBookingComponent,
    VerifyOtpComponent,

    // Passenger
    PassengerDashboardComponent,
    FlightSearchComponent,
    FlightDetailsComponent,
    SeatMapComponent,
    BookingComponent,
    PassengerDetailsComponent,
    PaymentComponent,
    MyBookingsComponent,
    NotificationsComponent,

    // Staff
    StaffDashboardComponent,
    AddFlightComponent,
    ManageFlightsComponent,
    ManageSeatsComponent,
    PassengerManifestComponent,

    // Admin
    AdminDashboardComponent,
    ManageAirlinesComponent,
    ManageAirportsComponent,
    ManageStaffComponent,
    PaymentsAdminComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
  ],
  providers: [
    TitleCasePipe,
    LowerCasePipe,
    DecimalPipe,
    DatePipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
