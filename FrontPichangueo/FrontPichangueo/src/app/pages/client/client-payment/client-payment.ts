import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { paymentTypeLabel, timeLabel } from '../../../core/formatters';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking, Payment, PaymentType } from '../../../core/models';

@Component({
  selector: 'app-client-payment',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe, LocalDatePipe],
  templateUrl: './client-payment.html',
})
export class ClientPayment implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly bookingId = Number(this.route.snapshot.paramMap.get('id'));
  readonly paymentTypeLabel = paymentTypeLabel;
  readonly timeLabel = timeLabel;
  paymentType: PaymentType = 'advance';
  booking: Booking | undefined;
  payment: Payment | undefined;
  loading = true;
  saving = false;
  error = '';

  get amountToPay(): number {
    if (!this.booking) return 0;
    if (this.paymentType === 'full') return this.booking.totalAmount;
    if (this.paymentType === 'balance') return Math.max(0, this.booking.totalAmount - this.booking.advance);
    return this.booking.advance;
  }

  ngOnInit(): void {
    this.api.getBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar la reserva para pagar.';
        this.cdr.detectChanges();
      },
    });
  }

  pay(): void {
    this.saving = true;
    this.error = '';
    this.api.createPayment({ bookingId: this.bookingId, paymentType: this.paymentType }).subscribe({
      next: (payment) => {
        this.payment = payment;
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.saving = false;
        this.error = 'No se pudo simular el pago.';
        this.cdr.detectChanges();
      },
    });
  }
}
