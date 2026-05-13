import { TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ToastComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(ToastComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
