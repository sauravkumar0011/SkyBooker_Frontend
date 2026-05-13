import { TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('NavbarComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(NavbarComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
