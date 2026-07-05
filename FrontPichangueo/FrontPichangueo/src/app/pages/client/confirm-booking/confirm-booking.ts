import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { timeLabel } from '../../../core/formatters';
import { LocalDatePipe, MoneyPipe } from '../../../core/l10n.pipe';
import { AvailableSchedule, Booking } from '../../../core/models';

@Component({
  selector: 'app-confirm-booking',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe, LocalDatePipe],
  templateUrl: './confirm-booking.html',
})
export class ConfirmBooking implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly timeLabel = timeLabel;
  readonly courtId = Number(this.route.snapshot.queryParamMap.get('courtId'));
  readonly courtScheduleId = Number(this.route.snapshot.queryParamMap.get('courtScheduleId'));
  readonly bookingDate = this.route.snapshot.queryParamMap.get('bookingDate') || '';
  durationHours = Number(this.route.snapshot.queryParamMap.get('durationHours') || 1);
  schedule: AvailableSchedule | undefined;
  loading = true;
  saving = false;
  error = '';

  get maxDuration(): number {
    if (!this.schedule) return 1;
    return Math.max(1, Math.floor((this.toMinutes(this.schedule.endTime) - this.toMinutes(this.schedule.startTime)) / 60));
  }

  get totalAmount(): number {
    return (this.schedule?.costPerHour ?? 0) * this.durationHours;
  }

  get advance(): number {
    return this.totalAmount * 0.5;
  }

  get endTimePreview(): string {
    if (!this.schedule) return '';
    const minutes = this.toMinutes(this.schedule.startTime) + this.durationHours * 60;
    return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.loadSchedule();
  }

  confirmBooking(): void {
    if (!this.schedule) return;

    this.saving = true;
    this.error = '';
    this.api.createBooking({
      courtScheduleId: this.courtScheduleId,
      bookingDate: this.bookingDate,
      durationHours: this.durationHours,
    }).subscribe({
      next: (booking: Booking) => {
        this.saving = false;
        void this.router.navigate(['/cliente/reservas', booking.id]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.status === 409
          ? 'Ese horario ya fue reservado. Elige otro horario disponible.'
          : 'No se pudo crear la reserva.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadSchedule(): void {
    this.loading = true;
    this.api.getAvailableSchedules(this.bookingDate, this.courtId).subscribe({
      next: (schedules) => {
        this.schedule = schedules.find((item) => item.courtScheduleId === this.courtScheduleId);
        if (!this.schedule) {
          this.error = 'El horario seleccionado ya no esta disponible.';
        }
        this.durationHours = Math.min(Math.max(1, this.durationHours), this.maxDuration);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el resumen de reserva.';
        this.cdr.detectChanges();
      },
    });
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
