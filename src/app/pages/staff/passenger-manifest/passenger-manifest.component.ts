import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PassengerService } from '../../../core/services/passenger.service';
import { Passenger } from '../../../models';

@Component({
  selector: 'app-passenger-manifest',
  templateUrl: './passenger-manifest.component.html',
  styleUrls: ['./passenger-manifest.component.css']
})
export class PassengerManifestComponent {
  form: FormGroup;
  passengers: Passenger[] = [];
  loading = false;
  searched = false;

  constructor(private fb: FormBuilder, private passengerService: PassengerService) {
    this.form = this.fb.group({ bookingId: ['', [Validators.required, Validators.min(1)]] });
  }

  load(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.searched = true;
    this.passengerService.getPassengersByBooking(this.form.value.bookingId).subscribe({
      next: data => { this.passengers = data; this.loading = false; },
      error: () => { this.passengers = []; this.loading = false; }
    });
  }
}
