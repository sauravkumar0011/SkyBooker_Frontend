import { TestBed } from '@angular/core/testing';
import { FlightDetailsComponent } from './flight-details.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('FlightDetailsComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(FlightDetailsComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FlightDetailsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
