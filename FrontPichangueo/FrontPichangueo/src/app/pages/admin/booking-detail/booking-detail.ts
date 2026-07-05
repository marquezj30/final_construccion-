import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { bookingStatusLabel, dayNames, paymentStatusLabel, paymentTypeLabel, timeLabel } from '../../../core/formatters';
import { LocalDatePipe, LocalDateTimePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking, Payment } from '../../../core/models';

@Component({
  selector: 'app-booking-detail',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe, LocalDateTimePipe],
  templateUrl: './booking-detail.html',
})
export class BookingDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  booking: Booking | undefined;
  payments: Payment[] = [];
  error = '';
  readonly dayNames = dayNames;
  readonly bookingStatusLabel = bookingStatusLabel;
  readonly paymentStatusLabel = paymentStatusLabel;
  readonly paymentTypeLabel = paymentTypeLabel;
  readonly timeLabel = timeLabel;

  ngOnInit(): void {
    this.api.getBooking(this.id).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar la reserva desde Azure.';
        this.cdr.detectChanges();
      },
    });

    this.api.getPaymentsByBooking(this.id).subscribe({
      next: (payments) => {
        this.payments = payments;
        this.cdr.detectChanges();
      },
      error: () => {
        this.payments = [];
        this.cdr.detectChanges();
      },
    });
  }
}
