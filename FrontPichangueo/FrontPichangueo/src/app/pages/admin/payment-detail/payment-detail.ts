import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { paymentStatusLabel, paymentTypeLabel, timeLabel } from '../../../core/formatters';
import { LocalDatePipe, LocalDateTimePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Payment } from '../../../core/models';

@Component({
  selector: 'app-payment-detail',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe, LocalDateTimePipe],
  templateUrl: './payment-detail.html',
})
export class PaymentDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  payment: Payment | undefined;
  error = '';
  readonly paymentStatusLabel = paymentStatusLabel;
  readonly paymentTypeLabel = paymentTypeLabel;
  readonly timeLabel = timeLabel;

  ngOnInit(): void {
    this.api.getPayments().subscribe({
      next: (payments) => {
        this.payment = payments.find((payment) => payment.paymentId === this.id);
        if (!this.payment) {
          this.error = 'No se encontro el pago solicitado.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar el pago desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }
}
