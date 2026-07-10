import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { timeLabel } from '../../../core/formatters';
import { LocalDateTimePipe } from '../../../core/l10n.pipe';
import { Challenge } from '../../../core/models';

@Component({
  selector: 'app-sent-challenges',
  imports: [CommonModule, RouterLink, LocalDateTimePipe],
  templateUrl: './sent-challenges.html',
})
export class SentChallenges implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly timeLabel = timeLabel;
  challenges: Challenge[] = [];
  loading = true;
  error = '';

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
}
