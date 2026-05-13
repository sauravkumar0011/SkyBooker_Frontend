import { TestBed } from '@angular/core/testing';
import { RetrieveBookingComponent } from './retrieve-booking.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('RetrieveBookingComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(RetrieveBookingComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(RetrieveBookingComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
