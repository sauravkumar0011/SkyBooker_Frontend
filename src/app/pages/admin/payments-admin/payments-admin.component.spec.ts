import { TestBed } from '@angular/core/testing';
import { PaymentsAdminComponent } from './payments-admin.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('PaymentsAdminComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(PaymentsAdminComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PaymentsAdminComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
