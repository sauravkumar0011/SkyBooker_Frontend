import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('HomeComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(HomeComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
