import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { timeLabel } from '../../../core/formatters';
import { MoneyPipe } from '../../../core/l10n.pipe';
import { AvailableSchedule, Challenge } from '../../../core/models';

@Component({
  selector: 'app-challenge-booking',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe],
  templateUrl: './challenge-booking.html',
})
export class ChallengeBooking implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly timeLabel = timeLabel;
  readonly challengeId = Number(this.route.snapshot.paramMap.get('id'));
  challenge: Challenge | undefined;
  loading = true;
  saving = false;
  error = '';

  scheduleSearchDate = this.toDateInput(new Date());
  availableSchedules: AvailableSchedule[] = [];
  loadingSchedules = false;
  selectedScheduleId: number | null = null;

  ngOnInit(): void {
    this.api.getChallenge(this.challengeId).subscribe({
      next: (challenge) => {
        this.challenge = challenge;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el reto.';
        this.cdr.detectChanges();
      },
    });
  }

  loadSchedules(): void {
    this.loadingSchedules = true;
    this.selectedScheduleId = null;
    this.api.getAvailableSchedules(this.scheduleSearchDate).subscribe({
      next: (schedules) => {
        this.availableSchedules = schedules;
        this.loadingSchedules = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSchedules = false;
        this.availableSchedules = [];
        this.cdr.detectChanges();
      },
    });
  }

  createBooking(): void {
    if (!this.selectedScheduleId) {
      this.error = 'Selecciona un horario de cancha disponible.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.api.createChallengeBooking(this.challengeId, {
      courtScheduleId: this.selectedScheduleId,
      bookingDate: this.scheduleSearchDate,
    }).subscribe({
      next: (result) => {
        this.saving = false;
        if (result.bookingId) {
          void this.router.navigate(['/cliente/reservas', result.bookingId]);
        } else {
          void this.router.navigateByUrl('/cliente/equipos/retos/enviados');
        }
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message ?? 'No se pudo crear la reserva.';
        this.cdr.detectChanges();
      },
    });
  }

  private toDateInput(date: Date): string {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
