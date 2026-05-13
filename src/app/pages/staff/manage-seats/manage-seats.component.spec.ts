import { TestBed } from '@angular/core/testing';
import { ManageSeatsComponent } from './manage-seats.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ManageSeatsComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(ManageSeatsComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ManageSeatsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
