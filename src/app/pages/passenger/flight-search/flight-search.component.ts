import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FlightService } from '../../../core/services/flight.service';
import { Flight } from '../../../models';

@Component({
  selector: 'app-flight-search',
  templateUrl: './flight-search.component.html',
  styleUrls: ['./flight-search.component.css']
})
export class FlightSearchComponent implements OnInit {
  form: FormGroup;
  flights: Flight[] = [];
  loading = false;
  searched = false;
  today = new Date().toISOString().split('T')[0];

  minPrice = 0;
  maxPrice = 100000;
  filteredFlights: Flight[] = [];
  allFlights: Flight[] = [];

  selectedDurations: string[] = [];
  selectedTimeSlots: string[] = [];

  expandedFilters: { [key: string]: boolean } = {
    price: false,
    duration: false,
    timeSlot: false
  };

  durationFilters = [
    { label: 'Up to 2 hours', value: '0-2', min: 0, max: 2 },
    { label: '2 - 4 hours', value: '2-4', min: 2, max: 4 },
    { label: '4 - 6 hours', value: '4-6', min: 4, max: 6 },
    { label: '6+ hours', value: '6+', min: 6, max: Infinity }
  ];

  timeSlotFilters = [
    { label: 'Early Morning (12AM - 6AM)', value: 'earlyMorning', start: 0, end: 6 },
    { label: 'Morning (6AM - 12PM)', value: 'morning', start: 6, end: 12 },
    { label: 'Afternoon (12PM - 6PM)', value: 'afternoon', start: 12, end: 18 },
    { label: 'Evening (6PM - 12AM)', value: 'evening', start: 18, end: 24 }
  ];

  constructor(
    private fb: FormBuilder,
    private flightService: FlightService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      origin: ['', [Validators.required, Validators.minLength(2)]],
      destination: ['', [Validators.required, Validators.minLength(2)]],
      departureDate: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['origin']) {
        this.form.patchValue({
          origin: params['origin'],
          destination: params['destination'],
          departureDate: params['departureDate']
        });
        this.search();
      }
    });
  }

  search(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { origin, destination, departureDate } = this.form.value;
    this.loading = true;
    this.searched = true;
    this.flightService.searchFlights(
      origin.toUpperCase(), destination.toUpperCase(), departureDate
    ).subscribe({
      next: data => {
        this.flights = data;
        this.allFlights = data;
        this.maxPrice = this.getMaxFlightPrice();
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  selectFlight(flight: Flight): void {
    this.router.navigate(['/passenger/flight', flight.flightId]);
  }

  toggleDuration(value: string): void {
    const index = this.selectedDurations.indexOf(value);
    if (index > -1) {
      this.selectedDurations.splice(index, 1);
    } else {
      this.selectedDurations.push(value);
    }
    this.applyFilters();
  }

  toggleTimeSlot(value: string): void {
    const index = this.selectedTimeSlots.indexOf(value);
    if (index > -1) {
      this.selectedTimeSlots.splice(index, 1);
    } else {
      this.selectedTimeSlots.push(value);
    }
    this.applyFilters();
  }

  toggleFilterSection(section: string): void {
    this.expandedFilters[section] = !this.expandedFilters[section];
  }

  applyFilters(): void {
    let filtered = this.allFlights;
    filtered = this.filterByPrice(filtered);
    filtered = this.filterByDuration(filtered);
    filtered = this.filterByTimeSlot(filtered);
    this.filteredFlights = filtered;
  }

  filterByPrice(flights: Flight[]): Flight[] {
    return flights.filter(f => f.basePrice <= this.maxPrice);
  }

  filterByDuration(flights: Flight[]): Flight[] {
    if (this.selectedDurations.length === 0) return flights;
    return flights.filter(f => {
      const duration = this.getDurationInHours(f.departureTime, f.arrivalTime);
      return this.selectedDurations.some(d => {
        const filter = this.durationFilters.find(df => df.value === d);
        return filter && duration >= filter.min && duration < filter.max;
      });
    });
  }

  filterByTimeSlot(flights: Flight[]): Flight[] {
    if (this.selectedTimeSlots.length === 0) return flights;
    return flights.filter(f => {
      const depHour = new Date(f.departureTime).getHours();
      return this.selectedTimeSlots.some(slot => {
        const filter = this.timeSlotFilters.find(sf => sf.value === slot);
        return filter && depHour >= filter.start && depHour < filter.end;
      });
    });
  }

  getDurationInHours(dep: string, arr: string): number {
    const diff = new Date(arr).getTime() - new Date(dep).getTime();
    return diff / 3600000;
  }

  getMaxFlightPrice(): number {
    if (this.allFlights.length === 0) return 100000;
    const max = Math.max(...this.allFlights.map(f => f.basePrice));
    return Math.ceil(max / 1000) * 1000;
  }

  getDuration(dep: string, arr: string): string {
    const diff = new Date(arr).getTime() - new Date(dep).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      ON_TIME: 'badge-success', DELAYED: 'badge-warning',
      CANCELLED: 'badge-danger', DEPARTED: 'badge-info', ARRIVED: 'badge-cyan'
    };
    return m[status] || 'badge-default';
  }
}
