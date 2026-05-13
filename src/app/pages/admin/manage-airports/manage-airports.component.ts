import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { ToastService } from '../../../core/services/toast.service';
import { Airport, AirportRequest } from '../../../models';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-manage-airports',
  templateUrl: './manage-airports.component.html',
  styleUrls: ['./manage-airports.component.css']
})
export class ManageAirportsComponent implements OnInit {
  airports: Airport[] = [];
  form: FormGroup;
  searchCtrl: FormGroup;
  loading = false;
  submitting = false;
  formOpen = false;
  editMode = false;
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private service: AirlineAirportService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      name:     ['', Validators.required],
      iataCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      icaoCode: ['', [Validators.maxLength(4)]],
      city:     [''],
      country:  [''],
      latitude: [''],
      longitude: [''],
      timezone: [''],
    });
    this.searchCtrl = this.fb.group({ keyword: [''] });
  }

  ngOnInit(): void {
    this.search('');
    this.searchCtrl.get('keyword')!.valueChanges.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(kw => this.search(kw || ''));
  }

  search(keyword: string): void {
    this.loading = true;
    this.service.searchAirports(keyword).subscribe({
      next: d => { this.airports = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  startEdit(a: Airport): void {
    this.formOpen = true;
    this.editMode = true; this.editingId = a.airportId;
    this.form.patchValue({
      name: a.name,
      iataCode: a.iataCode,
      icaoCode: a.icaoCode ?? '',
      city: a.city ?? '',
      country: a.country ?? '',
      latitude: a.latitude ?? '',
      longitude: a.longitude ?? '',
      timezone: a.timezone ?? ''
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
      ? this.service.updateAirport(this.editingId!, this.buildPayload())
      : this.service.createAirport(this.buildPayload());
    obs.subscribe({
      next: () => {
        this.toast.success(this.editMode ? 'Airport updated!' : 'Airport created!');
        this.cancelEdit(); this.submitting = false; this.search('');
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

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      if (controlName === 'name') return 'Airport name is required';
      if (controlName === 'iataCode') return 'IATA code is required';
    }

    if (controlName === 'iataCode' && (control.errors['minlength'] || control.errors['maxlength'])) {
      return 'IATA code must be exactly 3 characters';
    }

    if (controlName === 'icaoCode' && control.errors['maxlength']) {
      return 'ICAO code must be at most 4 characters';
    }

    return 'Invalid value';
  }

  private buildPayload(): AirportRequest {
    const raw = this.form.getRawValue();

    return {
      name: raw.name.trim(),
      iataCode: raw.iataCode.trim().toUpperCase(),
      icaoCode: this.normalizeOptional(raw.icaoCode)?.toUpperCase() ?? null,
      city: this.normalizeOptional(raw.city),
      country: this.normalizeOptional(raw.country),
      latitude: this.normalizeOptionalNumber(raw.latitude),
      longitude: this.normalizeOptionalNumber(raw.longitude),
      timezone: this.normalizeOptional(raw.timezone)
    };
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number(value);
  }
}
