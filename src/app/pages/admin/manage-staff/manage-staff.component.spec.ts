import { TestBed } from '@angular/core/testing';
import { ManageStaffComponent } from './manage-staff.component';
import { ComponentTestContext, configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('ManageStaffComponent', () => {
  let context: ComponentTestContext;

  beforeEach(async () => {
    context = createComponentTestContext();
    await configureComponentTest(ManageStaffComponent, context);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ManageStaffComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should submit selected airline id when creating staff', () => {
    const fixture = TestBed.createComponent(ManageStaffComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.setValue({
      fullName: '  Sky Staff  ',
      email: 'staff@skybooker.test',
      password: 'Secret@123',
      phone: '+911111111111',
      airlineId: 'airline-1',
      nationality: '  Indian  ',
    });

    component.onSubmit();

    expect(context.userManagementService.createStaff).toHaveBeenCalledWith({
      fullName: 'Sky Staff',
      email: 'staff@skybooker.test',
      password: 'Secret@123',
      phone: '+911111111111',
      airlineId: 'airline-1',
      nationality: 'Indian'
    });
  });
});
