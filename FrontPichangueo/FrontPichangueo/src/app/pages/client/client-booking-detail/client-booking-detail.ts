import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { bookingStatusLabel, dayNames, timeLabel } from '../../../core/formatters';
import { LocalDatePipe, LocalDateTimePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking, Payment } from '../../../core/models';

@Component({
  selector: 'app-client-booking-detail',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe, LocalDateTimePipe],
  templateUrl: './client-booking-detail.html',
})
export class ClientBookingDetail implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly bookingStatusLabel = bookingStatusLabel;
  readonly dayNames = dayNames;
  readonly timeLabel = timeLabel;
  booking: Booking | undefined;
  payments: Payment[] = [];
  showCancelModal = false;
  loading = true;
  cancelling = false;
  error = '';

  get canCancel(): boolean {
    return Boolean(this.booking && this.booking.status !== 'cancelled');
  }

  get cancelMessage(): string {
    if (!this.booking) return '';
    const start = new Date(`${this.booking.bookingDate.slice(0, 10)}T${this.booking.startTime}`);
    const hours = (start.getTime() - Date.now()) / 3_600_000;
    return hours < 4
      ? 'La reserva inicia en menos de 4 horas. Si cancelas, perderas el adelanto.'
      : 'La reserva inicia en 4 horas o mas. Si cancelas, corresponde recuperar el adelanto.';
  }

  ngOnInit(): void {
    this.loadBooking();
  }

  cancelBooking(): void {
    this.cancelling = true;
    this.api.cancelBooking(this.id).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.showCancelModal = false;
        this.cancelling = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cancelling = false;
        this.error = 'No se pudo cancelar la reserva.';
        this.cdr.detectChanges();
      },
    });
  }

  goToPayment(): void {
    void this.router.navigate(['/cliente/reservas', this.id, 'pagar']);
  }

  private loadBooking(): void {
    this.loading = true;
    this.api.getBooking(this.id).subscribe({
      next: (booking) => {
        this.booking = booking;
        this.loading = false;
        this.loadPayments();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el detalle de tu reserva.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadPayments(): void {
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
