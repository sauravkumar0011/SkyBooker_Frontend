import { TestBed } from '@angular/core/testing';
import { ManageAirportsComponent } from './manage-airports.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ManageAirportsComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(ManageAirportsComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ManageAirportsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
