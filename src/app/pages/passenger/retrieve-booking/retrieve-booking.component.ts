import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../models';

@Component({
  selector: 'app-retrieve-booking',
  templateUrl: './retrieve-booking.component.html',
  styleUrls: ['./retrieve-booking.component.css']
})
export class RetrieveBookingComponent {
  form: FormGroup;
  loading = false;
  booking: Booking | null = null;
  notFound = false;
  searchedPnr = '';

  constructor(private fb: FormBuilder, private bookingService: BookingService) {
    this.form = this.fb.group({ pnr: ['', Validators.required] });
  }

  search(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.notFound = false;
    this.booking = null;
    this.searchedPnr = this.form.value.pnr.toUpperCase();
    this.bookingService.getBookingByPnr(this.searchedPnr).subscribe({
      next: b => { this.booking = b; this.loading = false; },
      error: () => { this.notFound = true; this.loading = false; }
    });
  }

  getSeatLabel(): string {
    return this.booking?.seatIds?.join(', ') || '--';
  }
}
