import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FlightService } from '../../../core/services/flight.service';
import { Flight } from '../../../models';

@Component({
  selector: 'app-flight-details',
  templateUrl: './flight-details.component.html',
  styleUrls: ['./flight-details.component.css']
})
export class FlightDetailsComponent implements OnInit {
  flight: Flight | null = null;
  loading = true;
  flightId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flightService: FlightService
  ) {}

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('id') || '';
    this.flightService.getFlightById(this.flightId).subscribe({
      next: data => { this.flight = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  viewSeats(): void {
    this.router.navigate(['/passenger/seats', this.flightId]);
  }

  getDuration(): string {
    if (!this.flight) return '';
    const diff = new Date(this.flight.arrivalTime).getTime() - new Date(this.flight.departureTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }
}
