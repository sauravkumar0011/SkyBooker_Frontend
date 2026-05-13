import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { ToastService } from '../../../core/services/toast.service';
import { Airline, AirlineRequest } from '../../../models';

@Component({
  selector: 'app-manage-airlines',
  templateUrl: './manage-airlines.component.html',
  styleUrls: ['./manage-airlines.component.css']
})
export class ManageAirlinesComponent implements OnInit {
  airlines: Airline[] = [];
  form: FormGroup;
  loading = true;
  submitting = false;
  formOpen = false;
  editMode = false;
  editingId: string | null = null;
  selectedAirline: Airline | null = null;
  deactivating = false;

  constructor(
    private fb: FormBuilder,
    private service: AirlineAirportService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      name:     ['', Validators.required],
      iataCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
      icaoCode: ['', [Validators.maxLength(4)]],
      country:  [''],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.service.getAirlines().subscribe({
      next: d => { this.airlines = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  startEdit(a: Airline): void {
    this.formOpen = true;
    this.editMode = true;
    this.editingId = a.airlineId;
    this.form.patchValue({
      name: a.name,
      iataCode: a.iataCode,
      icaoCode: a.icaoCode ?? '',
      country: a.country ?? '',
      contactEmail: a.contactEmail ?? '',
      contactPhone: a.contactPhone ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editingId = null;
    this.form.reset();
    this.formOpen = false;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    const obs = this.editMode
      ? this.service.updateAirline(this.editingId!, this.buildPayload())
      : this.service.createAirline(this.buildPayload());
    obs.subscribe({
      next: () => {
        this.toast.success(this.editMode ? 'Airline updated!' : 'Airline created!');
        this.cancelEdit();
        this.submitting = false;
        this.load();
      },
      error: () => { this.submitting = false; }
    });
  }

  toggleForm(): void {
    this.formOpen = !this.formOpen;

    if (!this.formOpen && this.editMode) {
      this.cancelEdit();
    }
  }

  openDeactivateConfirm(airline: Airline): void {
    this.selectedAirline = airline;
  }

  closeDeactivateConfirm(): void {
    if (this.deactivating) return;
    this.selectedAirline = null;
  }

  confirmDeactivate(): void {
    if (!this.selectedAirline) return;

    this.deactivating = true;
    this.service.deactivateAirline(this.selectedAirline.airlineId).subscribe({
      next: () => {
        this.toast.success('Airline deactivated.');
        this.selectedAirline = null;
        this.deactivating = false;
        this.load();
      },
      error: () => { this.deactivating = false; }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      if (controlName === 'name') return 'Airline name is required';
      if (controlName === 'iataCode') return 'IATA code is required';
      if (controlName === 'contactEmail') return 'Contact email is required';
    }

    if (controlName === 'iataCode' && (control.errors['minlength'] || control.errors['maxlength'])) {
      return 'IATA code must be 2 or 3 characters';
    }

    if (controlName === 'icaoCode' && control.errors['maxlength']) {
      return 'ICAO code must be at most 4 characters';
    }

    if (controlName === 'contactEmail' && control.errors['email']) {
      return 'Enter a valid email address';
    }

    return 'Invalid value';
  }

  getAirlineStatus(airline: Airline): string {
    if (airline.status) {
      return airline.status;
    }

    return this.isAirlineActive(airline) ? 'ACTIVE' : 'INACTIVE';
  }

  getStatusClass(airline: Airline): string {
    return this.getAirlineStatus(airline).toUpperCase() === 'ACTIVE' ? 'badge-success' : 'badge-danger';
  }

  private isAirlineActive(airline: Airline): boolean {
    return airline.isActive ?? airline.active ?? false;
  }

  private buildPayload(): AirlineRequest {
    const raw = this.form.getRawValue();

    return {
      name: raw.name.trim(),
      iataCode: raw.iataCode.trim().toUpperCase(),
      icaoCode: this.normalizeOptional(raw.icaoCode)?.toUpperCase() ?? null,
      country: this.normalizeOptional(raw.country),
      contactEmail: raw.contactEmail.trim(),
      contactPhone: this.normalizeOptional(raw.contactPhone)
    };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
