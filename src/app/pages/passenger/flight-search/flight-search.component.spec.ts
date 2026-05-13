import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { FlightService } from '../../../core/services/flight.service';
import { FlightSearchComponent } from './flight-search.component';

describe('FlightSearchComponent', () => {
  let component: FlightSearchComponent;
  let fixture: ComponentFixture<FlightSearchComponent>;
  let flightService: jasmine.SpyObj<FlightService>;
  let router: jasmine.SpyObj<Router>;
  let queryParams$: Subject<Record<string, string>>;

  const flights = [
    {
      flightId: 'flight-1',
      flightNumber: 'SB101',
      departureTime: '2026-05-10T06:00:00',
      arrivalTime: '2026-05-10T07:30:00',
      basePrice: 5400,
      status: 'ON_TIME'
    },
    {
      flightId: 'flight-2',
      flightNumber: 'SB202',
      departureTime: '2026-05-10T14:00:00',
      arrivalTime: '2026-05-10T19:30:00',
      basePrice: 8200,
      status: 'DELAYED'
    }
  ] as any[];

  beforeEach(async () => {
    flightService = jasmine.createSpyObj<FlightService>('FlightService', ['searchFlights']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    queryParams$ = new Subject<Record<string, string>>();

    await TestBed.configureTestingModule({
      declarations: [FlightSearchComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: FlightService, useValue: flightService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FlightSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should patch route query params and auto-search on init', () => {
    flightService.searchFlights.and.returnValue(of(flights));

    queryParams$.next({
      origin: 'del',
      destination: 'bom',
      departureDate: '2026-05-10'
    });

    expect(component.form.value).toEqual({
      origin: 'del',
      destination: 'bom',
      departureDate: '2026-05-10'
    });
    expect(flightService.searchFlights).toHaveBeenCalledWith('DEL', 'BOM', '2026-05-10');
    expect(component.filteredFlights.length).toBe(2);
  });

  it('should mark the form touched and skip search when invalid', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.search();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(flightService.searchFlights).not.toHaveBeenCalled();
  });

  it('should search flights and apply filters on success', () => {
    flightService.searchFlights.and.returnValue(of(flights));
    component.form.setValue({
      origin: 'del',
      destination: 'bom',
      departureDate: '2026-05-10'
    });

    component.search();

    expect(component.loading).toBeFalse();
    expect(component.searched).toBeTrue();
    expect(component.flights.length).toBe(2);
    expect(component.maxPrice).toBe(9000);
    expect(component.filteredFlights.length).toBe(2);
  });

  it('should reset loading when the search fails', () => {
    flightService.searchFlights.and.returnValue(throwError(() => new Error('search failed')));
    component.form.setValue({
      origin: 'del',
      destination: 'bom',
      departureDate: '2026-05-10'
    });

    component.search();

    expect(component.loading).toBeFalse();
    expect(component.searched).toBeTrue();
  });

  it('should navigate to the selected flight details', () => {
    component.selectFlight({ flightId: 'flight-1' } as any);
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/flight', 'flight-1']);
  });

  it('should toggle duration and time-slot filters and reapply results', () => {
    component.allFlights = flights;

    component.toggleDuration('0-2');
    expect(component.selectedDurations).toEqual(['0-2']);
    expect(component.filteredFlights.length).toBe(1);

    component.toggleTimeSlot('afternoon');
    expect(component.selectedTimeSlots).toEqual(['afternoon']);
    expect(component.filteredFlights.length).toBe(0);

    component.toggleDuration('0-2');
    expect(component.selectedDurations).toEqual([]);
    expect(component.filteredFlights.length).toBe(1);
  });

  it('should toggle filter section state', () => {
    expect(component.expandedFilters['price']).toBeFalse();
    component.toggleFilterSection('price');
    expect(component.expandedFilters['price']).toBeTrue();
  });

  it('should calculate durations, max price, and status classes', () => {
    expect(component.getDurationInHours('2026-05-10T06:00:00.000Z', '2026-05-10T08:30:00.000Z')).toBe(2.5);
    expect(component.getDuration('2026-05-10T06:00:00.000Z', '2026-05-10T08:30:00.000Z')).toBe('2h 30m');
    expect(component.getMaxFlightPrice()).toBe(100000);

    component.allFlights = flights;
    expect(component.getMaxFlightPrice()).toBe(9000);
    expect(component.getStatusClass('ARRIVED')).toBe('badge-cyan');
    expect(component.getStatusClass('UNKNOWN')).toBe('badge-default');
  });
});
