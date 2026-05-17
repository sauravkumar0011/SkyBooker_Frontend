import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PassengerService } from '../../../core/services/passenger.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Passenger } from '../../../models';

@Component({
  selector: 'app-passenger-details',
  templateUrl: './passenger-details.component.html',
  styleUrls: ['./passenger-details.component.css']
})
export class PassengerDetailsComponent implements OnInit {
  form: FormGroup;
  loading = false;
  bookingId = '';
  seatId = '';
  passenger: Passenger | null = null;

  genders = ['MALE', 'FEMALE', 'OTHER'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private passengerService: PassengerService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      firstName:      ['', [Validators.required, Validators.minLength(2)]],
      lastName:       ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth:    ['', Validators.required],
      gender:         ['MALE', Validators.required],
      passportNumber: [''],
      nationality:    ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.bookingId = String(p['bookingId'] || '').trim();
      this.seatId    = String(p['seatId'] || '').trim();
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const formValue = this.form.getRawValue();
    const payload = {
      bookingId: this.bookingId,
      seatId:    this.seatId,
      ...formValue,
      passportNumber: this.normalizeOptionalPassport(formValue.passportNumber),
    };
    this.passengerService.createPassenger(payload).subscribe({
      next: p => {
        this.passenger = p;
        this.loading = false;
        this.toast.success(`Ticket ${p.ticketNumber} generated!`);
      },
      error: () => { this.loading = false; }
    });
  }

  goToPayment(): void {
    this.router.navigate(['/passenger/payment', this.bookingId]);
  }

  private normalizeOptionalPassport(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }
}
