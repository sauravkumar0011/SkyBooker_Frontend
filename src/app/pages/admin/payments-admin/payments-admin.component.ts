import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { Payment, RevenueReport } from '../../../models';

@Component({
  selector: 'app-payments-admin',
  templateUrl: './payments-admin.component.html',
  styleUrls: ['./payments-admin.component.css']
})
export class PaymentsAdminComponent implements OnInit {
  payments: Payment[] = [];
  revenue: RevenueReport | null = null;
  loading = false;
  revenueLoading = false;
  selectedStatus = 'PAID';
  statuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
  revenueForm: FormGroup;

  constructor(private paymentService: PaymentService, private fb: FormBuilder) {
    this.revenueForm = this.fb.group({
      start: ['', Validators.required],
      end:   ['', Validators.required],
    });
  }

  ngOnInit(): void { this.loadByStatus(); }

  loadByStatus(): void {
    this.loading = true;
    this.paymentService.getPaymentsByStatus(this.selectedStatus).subscribe({
      next: d => { this.payments = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  fetchRevenue(): void {
    if (this.revenueForm.invalid) { this.revenueForm.markAllAsTouched(); return; }
    this.revenueLoading = true;
    const { start, end } = this.revenueForm.value;
    this.paymentService.getRevenue(start + ':00', end + ':00').subscribe({
      next: d => { this.revenue = d; this.revenueLoading = false; },
      error: () => { this.revenueLoading = false; }
    });
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = { PENDING: 'badge-warning', PAID: 'badge-success', FAILED: 'badge-danger', REFUNDED: 'badge-info' };
    return m[s] || 'badge-default';
  }
}
