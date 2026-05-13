import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('AppComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(AppComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
