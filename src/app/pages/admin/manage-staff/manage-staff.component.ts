import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AirlineAirportService } from '../../../core/services/airline-airport.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserManagementService } from '../../../core/services/user-management.service';
import { Airline, User } from '../../../models';

type StaffAction = 'deactivate' | 'delete';

@Component({
  selector: 'app-manage-staff',
  templateUrl: './manage-staff.component.html',
  styleUrls: ['./manage-staff.component.css']
})
export class ManageStaffComponent implements OnInit {
  private readonly passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=]).*$/;

  form: FormGroup;
  staffMembers: User[] = [];
  activeAirlines: Airline[] = [];
  loading = true;
  airlineLoading = true;
  submitting = false;
  formOpen = false;
  actionLoading = false;
  selectedStaff: User | null = null;
  pendingAction: StaffAction | null = null;

  constructor(
    private fb: FormBuilder,
    private airlineAirportService: AirlineAirportService,
    private userManagementService: UserManagementService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(this.passwordPattern)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
      airlineId: ['', Validators.required],
      nationality: [''],
    });
  }

  ngOnInit(): void {
    this.loadActiveAirlines();
    this.loadStaff();
  }

  loadActiveAirlines(): void {
    this.airlineLoading = true;
    this.airlineAirportService.getAirlines().subscribe({
      next: airlines => {
        this.activeAirlines = airlines.filter(airline => this.isAirlineActive(airline));
        this.airlineLoading = false;
      },
      error: () => {
        this.activeAirlines = [];
        this.airlineLoading = false;
      }
    });
  }

  loadStaff(): void {
    this.loading = true;
    this.userManagementService.getStaffUsers().subscribe({
      next: staff => {
        this.staffMembers = staff;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.userManagementService.createStaff(this.buildPayload()).subscribe({
      next: () => {
        this.toast.success('Staff account created.');
        this.form.reset();
        this.formOpen = false;
        this.submitting = false;
        this.loadStaff();
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  toggleForm(): void {
    this.formOpen = !this.formOpen;

    if (!this.formOpen) {
      this.form.reset();
    }
  }

  openConfirm(staff: User, action: StaffAction): void {
    this.selectedStaff = staff;
    this.pendingAction = action;
  }

  closeConfirm(): void {
    if (this.actionLoading) return;

    this.selectedStaff = null;
    this.pendingAction = null;
  }

  confirmAction(): void {
    if (!this.selectedStaff || !this.pendingAction) return;

    this.actionLoading = true;

    const request = this.pendingAction === 'deactivate'
      ? this.userManagementService.deactivateUser(this.selectedStaff.userId)
      : this.userManagementService.deleteUser(this.selectedStaff.userId);

    request.subscribe({
      next: () => {
        this.toast.success(this.pendingAction === 'deactivate' ? 'Staff account deactivated.' : 'Staff account deleted.');
        this.actionLoading = false;
        this.closeConfirm();
        this.loadStaff();
      },
      error: () => {
        this.actionLoading = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      if (controlName === 'fullName') return 'Full name is required';
      if (controlName === 'email') return 'Email is required';
      if (controlName === 'password') return 'Password is required';
      if (controlName === 'phone') return 'Phone number is required';
      if (controlName === 'airlineId') return 'Airline is required';
    }

    if (controlName === 'email' && control.errors['email']) {
      return 'Enter a valid email address';
    }

    if (controlName === 'password') {
      if (control.errors['minlength']) {
        return 'Password must be at least 8 characters';
      }

      if (control.errors['pattern']) {
        return 'Password must contain uppercase, lowercase, number and special character';
      }
    }

    if (controlName === 'phone' && control.errors['pattern']) {
      return 'Enter a valid phone number';
    }

    return 'Invalid value';
  }

  getStaffStatus(user: User): string {
    if (user.status?.trim()) {
      return user.status.trim().toUpperCase();
    }

    return (user.isActive ?? user.active) === false ? 'INACTIVE' : 'ACTIVE';
  }

  getStatusClass(user: User): string {
    return this.getStaffStatus(user) === 'ACTIVE' ? 'badge-success' : 'badge-danger';
  }

  private buildPayload(): { fullName: string; email: string; password: string; phone: string; airlineId: string; nationality: string | null } {
    const raw = this.form.getRawValue();

    return {
      fullName: raw.fullName.trim(),
      email: raw.email.trim(),
      password: raw.password,
      phone: raw.phone.trim(),
      airlineId: raw.airlineId,
      nationality: this.normalizeOptional(raw.nationality),
    };
  }

  private isAirlineActive(airline: Airline): boolean {
    if (airline.status?.trim()) {
      return airline.status.trim().toUpperCase() === 'ACTIVE';
    }

    return airline.isActive ?? airline.active ?? false;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
