import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('FooterComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(FooterComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
