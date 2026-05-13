import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { FlightService } from '../../../core/services/flight.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { FlightRequest } from '../../../models';

@Component({
  selector: 'app-add-flight',
  templateUrl: './add-flight.component.html',
  styleUrls: ['./add-flight.component.css']
})
export class AddFlightComponent implements OnInit {
  form: FormGroup;
  loading = false;
  currentAirlineName = '';
  aircraftTypes = ['Boeing 737', 'Boeing 777', 'Boeing 787', 'Airbus A220', 'Airbus A320', 'Airbus A350'];
  private readonly currentAirlineId: string;

  constructor(
    private fb: FormBuilder,
    private airlineAirportService: AirlineAirportService,
    private flightService: FlightService,
    private toast: ToastService,
    private router: Router,
    private auth: AuthService
  ) {
    this.currentAirlineId = this.auth.getAirlineId();
    this.form = this.fb.group({
      flightNumber:          ['', Validators.required],
      airlineId:             [this.currentAirlineId, Validators.required],
      originAirportCode:     ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      destinationAirportCode:['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      departureTime:         ['', Validators.required],
      arrivalTime:           ['', Validators.required],
      aircraftType:          ['', Validators.required],
      totalSeats:            ['', [Validators.required, Validators.min(1)]],
      basePrice:             ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadCurrentAirlineName();
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.flightService.createFlight(this.buildPayload()).subscribe({
      next: f => {
        this.toast.success(`Flight ${f.flightNumber} created!`);
        this.router.navigate(['/staff/flights']);
      },
      error: () => { this.loading = false; }
    });
  }

  private buildPayload(): FlightRequest {
    const raw = this.form.getRawValue();

    return {
      flightNumber: raw.flightNumber.trim(),
      airlineId: this.currentAirlineId,
      originAirportCode: raw.originAirportCode.trim().toUpperCase(),
      destinationAirportCode: raw.destinationAirportCode.trim().toUpperCase(),
      departureTime: raw.departureTime,
      arrivalTime: raw.arrivalTime,
      aircraftType: raw.aircraftType.trim(),
      totalSeats: Number(raw.totalSeats),
      basePrice: Number(raw.basePrice)
    };
  }

  private loadCurrentAirlineName(): void {
    if (!this.currentAirlineId) return;

    this.airlineAirportService.getAirlines().subscribe({
      next: airlines => {
        const airline = airlines.find(item => item.airlineId === this.currentAirlineId);
        this.currentAirlineName = airline?.name || '';
      }
    });
  }
}
