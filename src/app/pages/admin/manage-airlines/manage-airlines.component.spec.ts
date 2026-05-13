import { TestBed } from '@angular/core/testing';
import { ManageAirlinesComponent } from './manage-airlines.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ManageAirlinesComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(ManageAirlinesComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ManageAirlinesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
