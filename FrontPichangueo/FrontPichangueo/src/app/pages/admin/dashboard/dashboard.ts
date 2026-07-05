import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { bookingStatusLabel } from '../../../core/formatters';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking, Court, Payment } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe, TranslatePipe],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  courts: Court[] = [];
  bookings: Booking[] = [];
  payments: Payment[] = [];
  loading = true;
  error = '';
  readonly statusLabel = bookingStatusLabel;

  get activeCourts(): number {
    return this.courts.filter((court) => court.status).length;
  }

  get todayBookings(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.bookings.filter((booking) => booking.bookingDate.slice(0, 10) === today).length;
  }

  get pendingPayments(): number {
    return this.payments.filter((payment) => payment.paymentStatus === 'pending_review').length;
  }

  get recentBookings() {
    return this.bookings.slice(0, 3);
  }

  ngOnInit(): void {
    this.loading = true;
    this.error = '';

    this.api.getCourts().subscribe({
      next: (courts) => {
        this.courts = courts;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar las canchas.';
        this.cdr.detectChanges();
      },
    });

    this.api.getBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.bookings = [];
        this.loading = false;
        this.error = 'No se pudieron cargar las reservas.';
        this.cdr.detectChanges();
      },
    });

    this.api.getPayments().subscribe({
      next: (payments) => {
        this.payments = payments;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos.';
        this.cdr.detectChanges();
      },
    });
  }
}
