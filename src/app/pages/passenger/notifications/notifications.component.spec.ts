import { TestBed } from '@angular/core/testing';
import { NotificationsComponent } from './notifications.component';
import { configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('NotificationsComponent', () => {
  beforeEach(async () => {
    await configureComponentTest(NotificationsComponent, createComponentTestContext());
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
