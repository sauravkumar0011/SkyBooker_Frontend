import { TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('LoadingSpinnerComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(LoadingSpinnerComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
