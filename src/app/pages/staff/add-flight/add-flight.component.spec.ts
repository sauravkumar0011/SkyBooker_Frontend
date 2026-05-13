import { TestBed } from '@angular/core/testing';
import { AddFlightComponent } from './add-flight.component';
import { ComponentTestContext, configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('AddFlightComponent', () => {
  let context: ComponentTestContext;

  beforeEach(async () => {
    context = createComponentTestContext();
    await configureComponentTest(AddFlightComponent, context);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AddFlightComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should submit flights with the logged-in staff airline id', () => {
    const fixture = TestBed.createComponent(AddFlightComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      flightNumber: ' SB101 ',
      airlineId: 'different-airline-id',
      originAirportCode: 'del',
      destinationAirportCode: 'bom',
      departureTime: '2026-05-14T08:00',
      arrivalTime: '2026-05-14T10:00',
      aircraftType: ' A320 ',
      totalSeats: '180',
      basePrice: '5400',
    });

    component.onSubmit();

    expect(context.flightService.createFlight).toHaveBeenCalledWith({
      flightNumber: 'SB101',
      airlineId: 'airline-1',
      originAirportCode: 'DEL',
      destinationAirportCode: 'BOM',
      departureTime: '2026-05-14T08:00',
      arrivalTime: '2026-05-14T10:00',
      aircraftType: 'A320',
      totalSeats: 180,
      basePrice: 5400
    });
  });
});
