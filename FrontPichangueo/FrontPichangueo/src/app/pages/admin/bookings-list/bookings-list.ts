import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { bookingStatusLabel } from '../../../core/formatters';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { Booking } from '../../../core/models';

@Component({
  selector: 'app-bookings-list',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe, LocalDatePipe, TranslatePipe],
  templateUrl: './bookings-list.html',
})
export class BookingsList implements OnInit {
  statusFilter = 'all';
  dateFilter = '';
  bookings: Booking[] = [];
  loading = true;
  error = '';
  readonly statusLabel = bookingStatusLabel;

  constructor(private readonly api: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.api.getBookings().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar las reservas desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }

  get filteredBookings() {
    return this.bookings.filter((booking) => {
      const matchesStatus = this.statusFilter === 'all' || booking.status === this.statusFilter;
      const matchesDate = !this.dateFilter || booking.bookingDate.slice(0, 10) === this.dateFilter;
      return matchesStatus && matchesDate;
    });
  }
}
