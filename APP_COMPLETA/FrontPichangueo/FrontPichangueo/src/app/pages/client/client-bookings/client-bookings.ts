import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { bookingStatusLabel, timeLabel } from '../../../core/formatters';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking } from '../../../core/models';

@Component({
  selector: 'app-client-bookings',
  imports: [CommonModule, RouterLink, MoneyPipe, LocalDatePipe, TranslatePipe],
  templateUrl: './client-bookings.html',
})
export class ClientBookings implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly bookingStatusLabel = bookingStatusLabel;
  readonly timeLabel = timeLabel;
  bookings: Booking[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadBookings();
  }

  private loadBookings(): void {
    this.loading = true;
    this.api.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar tus reservas.';
        this.cdr.detectChanges();
      },
    });
  }
}
