import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { timeLabel } from '../../../core/formatters';
import { LocalDateTimePipe } from '../../../core/l10n.pipe';
import { Challenge } from '../../../core/models';

const STAR_OPTIONS = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-sent-challenges',
  imports: [CommonModule, FormsModule, RouterLink, LocalDateTimePipe],
  templateUrl: './sent-challenges.html',
})
export class SentChallenges implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly timeLabel = timeLabel;
  challenges: Challenge[] = [];
  loading = true;
  error = '';
  success = '';

  readonly starOptions = STAR_OPTIONS;
  challengeToRate: Challenge | undefined;
  ratedChallengeIds = new Set<number>();
  ratingStars = 5;
  ratingComment = '';
  rating = false;
  ratingError = '';

  ngOnInit(): void {
    this.loading = true;
    this.api.getSentChallenges().subscribe({
      next: (challenges) => {
        this.challenges = challenges;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 403
          ? 'Debes ser lider de un equipo para ver los retos enviados.'
          : 'No se pudieron cargar los retos enviados.';
        this.cdr.detectChanges();
      },
    });
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
      ratedTeamId: this.challengeToRate.challengedTeamId,
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
}
