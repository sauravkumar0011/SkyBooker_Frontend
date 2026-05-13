import { Component, OnInit } from '@angular/core';
import { FlightService } from '../../../core/services/flight.service';
import { AuthService } from '../../../core/services/auth.service';
import { Flight } from '../../../models';

@Component({
  selector: 'app-staff-dashboard',
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css']
})
export class StaffDashboardComponent implements OnInit {
  flights: Flight[] = [];
  loading = true;
  get onTime() { return this.flights.filter(f => this.normalizeStatus(f.status) === 'ON_TIME').length; }
  get delayed() { return this.flights.filter(f => this.normalizeStatus(f.status) === 'DELAYED').length; }
  get cancelled() { return this.flights.filter(f => this.normalizeStatus(f.status) === 'CANCELLED').length; }

  constructor(private flightService: FlightService, public auth: AuthService) {}

  ngOnInit(): void {
    const airlineId = this.auth.getAirlineId();
    if (!airlineId) {
      this.flights = [];
      this.loading = false;
      return;
    }

    this.flightService.getFlightsByAirline(airlineId).subscribe({
      next: data => { this.flights = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getStatusClass(s: string): string {
    const status = this.normalizeStatus(s);
    const m: Record<string, string> = { ON_TIME: 'badge-success', DELAYED: 'badge-warning', CANCELLED: 'badge-danger', DEPARTED: 'badge-info', ARRIVED: 'badge-cyan' };
    return m[status] || 'badge-default';
  }

  private normalizeStatus(status: string): string {
    return status.trim().toUpperCase();
  }
}
