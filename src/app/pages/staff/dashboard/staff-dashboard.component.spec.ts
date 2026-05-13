import { TestBed } from '@angular/core/testing';
import { StaffDashboardComponent } from './staff-dashboard.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('StaffDashboardComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(StaffDashboardComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(StaffDashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
