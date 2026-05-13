import { TestBed } from '@angular/core/testing';
import { PassengerDashboardComponent } from './dashboard.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('PassengerDashboardComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(PassengerDashboardComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PassengerDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
