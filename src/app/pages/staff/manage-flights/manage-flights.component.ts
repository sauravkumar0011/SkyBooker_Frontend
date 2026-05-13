import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { AuthService } from '../../../core/services/auth.service';
import { FlightService } from '../../../core/services/flight.service';
import { ToastService } from '../../../core/services/toast.service';
import { Flight, FlightRequest, FlightStatus } from '../../../models';

@Component({
  selector: 'app-manage-flights',
  templateUrl: './manage-flights.component.html',
  styleUrls: ['./manage-flights.component.css']
})
export class ManageFlightsComponent implements OnInit {
  flights: Flight[] = [];
  editForm: FormGroup;
  loading = true;
  updatingId: string | null = null;
  savingEdit = false;
  deleting = false;
  editingFlight: Flight | null = null;
  deletingFlight: Flight | null = null;
  currentAirlineName = '';
  aircraftTypes = ['Boeing 737', 'Boeing 777', 'Boeing 787', 'Airbus A220', 'Airbus A320', 'Airbus A350'];
  statuses: FlightStatus[] = ['ON_TIME', 'DELAYED', 'CANCELLED', 'DEPARTED', 'ARRIVED'];
  private readonly currentAirlineId: string;

  constructor(
    private fb: FormBuilder,
    private airlineAirportService: AirlineAirportService,
    private auth: AuthService,
    private flightService: FlightService,
    private toast: ToastService
  ) {
    this.currentAirlineId = this.auth.getAirlineId();
    this.editForm = this.fb.group({
      flightNumber: ['', Validators.required],
      airlineId: [this.currentAirlineId, Validators.required],
      originAirportCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      destinationAirportCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      departureTime: ['', Validators.required],
      arrivalTime: ['', Validators.required],
      aircraftType: ['', Validators.required],
      totalSeats: ['', [Validators.required, Validators.min(1)]],
      basePrice: ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadCurrentAirlineName();
    this.load();
  }

  load(): void {
    if (!this.currentAirlineId) {
      this.flights = [];
      this.loading = false;
      return;
    }

    this.flightService.getFlightsByAirline(this.currentAirlineId).subscribe({
      next: data => {
        this.flights = data.map(f => ({ ...f, status: this.normalizeStatus(f.status) }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  updateStatus(flight: Flight, status: FlightStatus | string): void {
    const normalizedStatus = this.normalizeStatus(status);
    const previousStatus = flight.status;
    flight.status = normalizedStatus;
    this.updatingId = flight.flightId;
    this.flightService.updateFlightStatus(flight.flightId, normalizedStatus).subscribe({
      next: updated => {
        const idx = this.flights.findIndex(f => f.flightId === flight.flightId);
        if (idx !== -1) this.flights[idx] = { ...updated, status: normalizedStatus };
        this.toast.success(`${flight.flightNumber} status updated to ${normalizedStatus}`);
        this.updatingId = null;
      },
      error: () => {
        flight.status = previousStatus;
        this.updatingId = null;
      }
    });
  }

  openEdit(flight: Flight): void {
    this.editingFlight = flight;
    this.editForm.patchValue({
      flightNumber: flight.flightNumber,
      airlineId: this.currentAirlineId,
      originAirportCode: flight.originAirportCode,
      destinationAirportCode: flight.destinationAirportCode,
      departureTime: this.toDateTimeLocal(flight.departureTime),
      arrivalTime: this.toDateTimeLocal(flight.arrivalTime),
      aircraftType: flight.aircraftType,
      totalSeats: flight.totalSeats,
      basePrice: flight.basePrice
    });
  }

  closeEdit(): void {
    if (this.savingEdit) return;
    this.editingFlight = null;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (!this.editingFlight) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }

    this.savingEdit = true;
    this.flightService.updateFlight(this.editingFlight.flightId, this.buildEditPayload()).subscribe({
      next: updated => {
        const idx = this.flights.findIndex(f => f.flightId === updated.flightId);
        if (idx !== -1) this.flights[idx] = updated;
        this.toast.success(`${updated.flightNumber} updated.`);
        this.savingEdit = false;
        this.closeEdit();
      },
      error: () => { this.savingEdit = false; }
    });
  }

  openDeleteConfirm(flight: Flight): void {
    this.deletingFlight = flight;
  }

  closeDeleteConfirm(): void {
    if (this.deleting) return;
    this.deletingFlight = null;
  }

  confirmDelete(): void {
    if (!this.deletingFlight) return;

    const flight = this.deletingFlight;
    this.deleting = true;
    this.flightService.deleteFlight(flight.flightId).subscribe({
      next: () => {
        this.flights = this.flights.filter(f => f.flightId !== flight.flightId);
        this.toast.success(`${flight.flightNumber} deleted.`);
        this.deleting = false;
        this.deletingFlight = null;
      },
      error: () => { this.deleting = false; }
    });
  }

  getStatusClass(s: string): string {
    const status = this.normalizeStatus(s);
    const m: Record<string, string> = { ON_TIME: 'badge-success', DELAYED: 'badge-warning', CANCELLED: 'badge-danger', DEPARTED: 'badge-info', ARRIVED: 'badge-cyan' };
    return m[status] || 'badge-default';
  }

  displayStatus(s: string): string {
    return this.normalizeStatus(s);
  }

  hasCustomAircraftType(): boolean {
    const aircraftType = String(this.editForm.get('aircraftType')?.value || '').trim();
    return Boolean(aircraftType) && !this.aircraftTypes.includes(aircraftType);
  }

  private buildEditPayload(): FlightRequest {
    const raw = this.editForm.getRawValue();

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

  private toDateTimeLocal(value: string): string {
    return value ? value.slice(0, 16) : '';
  }

  private normalizeStatus(status: string): FlightStatus {
    return status
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase() as FlightStatus;
  }
}
