import { TestBed } from '@angular/core/testing';
import { VerifyOtpComponent } from './verify-otp.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('VerifyOtpComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(VerifyOtpComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(VerifyOtpComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
