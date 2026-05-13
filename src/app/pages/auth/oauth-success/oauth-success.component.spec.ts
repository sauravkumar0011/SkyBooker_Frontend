import { TestBed } from '@angular/core/testing';
import { OAuthSuccessComponent } from './oauth-success.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('OAuthSuccessComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(OAuthSuccessComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OAuthSuccessComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
