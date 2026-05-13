import { TestBed } from '@angular/core/testing';
import { PassengerManifestComponent } from './passenger-manifest.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('PassengerManifestComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(PassengerManifestComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PassengerManifestComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
