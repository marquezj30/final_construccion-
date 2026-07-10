import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcceptChallengeResult, ApiService } from '../../../core/api.service';
import { timeLabel } from '../../../core/formatters';
import { LocalDateTimePipe } from '../../../core/l10n.pipe';
import { AvailableSchedule, Challenge } from '../../../core/models';

const STAR_OPTIONS = [1, 2, 3, 4, 5];

type ChallengeState = 'pending' | 'accepted' | 'rejected';

@Component({
  selector: 'app-received-challenges',
  imports: [CommonModule, FormsModule, RouterLink, LocalDateTimePipe],
  templateUrl: './received-challenges.html',
})
export class ReceivedChallenges implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly timeLabel = timeLabel;
  challenges: Challenge[] = [];
  loading = true;
  error = '';
  success = '';
  rejectingId = 0;

  challengeToAccept: Challenge | undefined;
  accepting = false;
  acceptError = '';
  newDate = '';
  scheduleSearchDate = this.toDateInput(new Date());
  availableSchedules: AvailableSchedule[] = [];
  loadingSchedules = false;
  newScheduleId: number | null = null;

  readonly starOptions = STAR_OPTIONS;
  challengeToRate: Challenge | undefined;
  ratedChallengeIds = new Set<number>();
  ratingStars = 5;
  ratingComment = '';
  rating = false;
  ratingError = '';

  ngOnInit(): void {
    this.loadChallenges();
  }

  state(challenge: Challenge): ChallengeState {
    if (challenge.status) return 'accepted';
    if (challenge.responseDate) return 'rejected';
    return 'pending';
  }

  isCompleted(challenge: Challenge): boolean {
    if (!challenge.status || !challenge.bookingId || !challenge.proposedDateTime) {
      return false;
    }
    return new Date(challenge.proposedDateTime).getTime() < Date.now();
  }

  canRate(challenge: Challenge): boolean {
    return this.isCompleted(challenge) && !this.ratedChallengeIds.has(challenge.challengeId);
  }

  openRateModal(challenge: Challenge): void {
    this.challengeToRate = challenge;
    this.ratingStars = 5;
    this.ratingComment = '';
    this.ratingError = '';
  }

  closeRateModal(): void {
    this.challengeToRate = undefined;
  }

  confirmRate(): void {
    if (!this.challengeToRate) return;

    this.rating = true;
    this.ratingError = '';
    this.api.rateTeam({
      ratedTeamId: this.challengeToRate.challengingTeamId,
      stars: this.ratingStars,
      comment: this.ratingComment.trim() || undefined,
    }).subscribe({
      next: () => {
        this.rating = false;
        this.ratedChallengeIds.add(this.challengeToRate!.challengeId);
        this.challengeToRate = undefined;
        this.success = 'Calificacion enviada.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rating = false;
        if (err.status === 409) {
          this.ratingError = 'Tu equipo ya califico a este equipo.';
        } else if (err.status === 403) {
          this.ratingError = 'Debes ser lider de tu equipo para calificar.';
        } else {
          this.ratingError = err.error?.message ?? 'No se pudo enviar la calificacion.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  reject(challenge: Challenge): void {
    this.rejectingId = challenge.challengeId;
    this.error = '';
    this.success = '';
    this.api.rejectChallenge(challenge.challengeId).subscribe({
      next: () => {
        this.rejectingId = 0;
        this.success = 'Reto rechazado.';
        this.loadChallenges();
      },
      error: () => {
        this.rejectingId = 0;
        this.error = 'No se pudo rechazar el reto.';
        this.cdr.detectChanges();
      },
    });
  }

  openAcceptModal(challenge: Challenge): void {
    this.challengeToAccept = challenge;
    this.acceptError = '';
    this.newDate = challenge.proposedDateTime ? challenge.proposedDateTime.slice(0, 10) : '';
    this.scheduleSearchDate = this.newDate || this.toDateInput(new Date());
    this.newScheduleId = null;
    this.availableSchedules = [];
  }

  closeAcceptModal(): void {
    this.challengeToAccept = undefined;
  }

  loadSchedulesForAccept(): void {
    this.loadingSchedules = true;
    this.newScheduleId = null;
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

  confirmAccept(): void {
    if (!this.challengeToAccept) return;

    this.accepting = true;
    this.acceptError = '';
    this.api.acceptChallenge(this.challengeToAccept.challengeId, {
      courtScheduleId: this.newScheduleId ?? undefined,
      bookingDate: this.newDate || undefined,
    }).subscribe({
      next: (result) => {
        this.accepting = false;
        this.challengeToAccept = undefined;
        const warning = (result as AcceptChallengeResult).warning;
        this.success = warning ?? 'Reto aceptado.';
        this.loadChallenges();
      },
      error: (err) => {
        this.accepting = false;
        this.acceptError = err.error?.message ?? 'No se pudo aceptar el reto.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadChallenges(): void {
    this.loading = true;
    this.api.getReceivedChallenges().subscribe({
      next: (challenges) => {
        this.challenges = challenges;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 403
          ? 'Debes ser lider de un equipo para ver los retos recibidos.'
          : 'No se pudieron cargar los retos recibidos.';
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
