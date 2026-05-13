import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  searchForm: FormGroup;
  today = new Date().toISOString().split('T')[0];

  features = [
    { icon: '🔍', title: 'Smart Search', desc: 'Find the best flights across all routes instantly' },
    { icon: '🪑', title: 'Seat Selection', desc: 'Pick your perfect seat with our interactive seat map' },
    { icon: '📱', title: 'Instant Booking', desc: 'Book in minutes, receive your e-ticket immediately' },
    { icon: '🔔', title: 'Live Updates', desc: 'Real-time notifications on flight status changes' },
  ];

  constructor(private fb: FormBuilder, private router: Router, public auth: AuthService) {
    this.searchForm = this.fb.group({
      origin: ['', [Validators.required, Validators.minLength(2)]],
      destination: ['', [Validators.required, Validators.minLength(2)]],
      departureDate: ['', Validators.required],
    });
  }

  onSearch(): void {
    if (this.searchForm.invalid) { this.searchForm.markAllAsTouched(); return; }
    const { origin, destination, departureDate } = this.searchForm.value;
    this.router.navigate(['/passenger/flights'], { queryParams: { origin, destination, departureDate } });
  }
}
