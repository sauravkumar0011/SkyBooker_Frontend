import { TestBed } from '@angular/core/testing';
import { ManageFlightsComponent } from './manage-flights.component';
import { ComponentTestContext, configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ManageFlightsComponent', () => {
  let context: ComponentTestContext;

  beforeEach(async () => {
    context = createComponentTestContext();
    await configureComponentTest(ManageFlightsComponent, context);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ManageFlightsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load only flights for the logged-in airline', () => {
    const fixture = TestBed.createComponent(ManageFlightsComponent);
    fixture.detectChanges();

    expect(context.flightService.getFlightsByAirline).toHaveBeenCalledWith('airline-1');
    expect(context.flightService.getAllFlights).not.toHaveBeenCalled();
  });
});
