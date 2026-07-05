import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { paymentStatusLabel, paymentTypeLabel } from '../../../core/formatters';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Payment } from '../../../core/models';

@Component({
  selector: 'app-payments-list',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe],
  templateUrl: './payments-list.html',
})
export class PaymentsList implements OnInit {
  payments: Payment[] = [];
  loading = true;
  error = '';
  readonly paymentStatusLabel = paymentStatusLabel;
  readonly paymentTypeLabel = paymentTypeLabel;

  constructor(private readonly api: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.api.getPayments().subscribe({
      next: (payments) => {
        this.payments = payments;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los pagos desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }
}
