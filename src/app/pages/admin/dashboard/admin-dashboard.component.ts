import { Component, OnInit } from '@angular/core';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { PaymentService } from '../../../core/services/payment.service';
import { Airline, Airport, Payment } from '../../../models';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  airlines: Airline[] = [];
  airports: Airport[] = [];
  payments: Payment[] = [];

  get totalRevenue() {
    return this.payments
      .filter(payment => payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0);
  }

  get activeAirlines() {
    return this.airlines.filter(airline => this.getAirlineStatus(airline) === 'ACTIVE');
  }

  constructor(
    private airlineAirportService: AirlineAirportService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.airlineAirportService.getAirlines().subscribe({ next: data => this.airlines = data, error: () => {} });
    this.airlineAirportService.searchAirports('').subscribe({ next: data => this.airports = data, error: () => {} });
    this.paymentService.getPaymentsByStatus('PAID').subscribe({ next: data => this.payments = data, error: () => {} });
  }

  getAirlineStatus(airline: Airline): string {
    const status = airline.status || ((airline.isActive ?? airline.active ?? false) ? 'ACTIVE' : 'INACTIVE');
    return status.toUpperCase();
  }
}
