import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { timeLabel } from '../../../core/formatters';
import { AvailableSchedule, Team } from '../../../core/models';

@Component({
  selector: 'app-send-challenge',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './send-challenge.html',
})
export class SendChallenge implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = this.auth.currentUser();
  readonly timeLabel = timeLabel;
  readonly challengedTeamId = Number(this.route.snapshot.paramMap.get('id'));
  team: Team | undefined;
  myTeamId = 0;
  loading = true;
  saving = false;
  error = '';

  message = '';
  isExternal = false;
  proposedDate = '';
  proposedTime = '';
  scheduleDate = this.toDateInput(new Date());
  availableSchedules: AvailableSchedule[] = [];
  loadingSchedules = false;
  selectedScheduleId: number | null = null;

  get canSubmit(): boolean {
    if (this.isExternal) return true;
    return Boolean(this.proposedDate && this.proposedTime);
  }

  ngOnInit(): void {
    this.api.getMyTeams().subscribe({
      next: (myTeams) => {
        const leaderTeam = myTeams.find((item) =>
          item.members?.some((member) => member.userId === this.currentUser.id && member.role === 'leader'),
        );
        this.myTeamId = leaderTeam?.id ?? 0;

        if (!this.myTeamId) {
          this.loading = false;
          this.error = 'Debes ser lider de un equipo para retar a otros equipos.';
          this.cdr.detectChanges();
          return;
        }

        this.api.getTeam(this.challengedTeamId).subscribe({
          next: (team) => {
            this.team = team;
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.error = 'No se pudo cargar el equipo retado.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar tus equipos.';
        this.cdr.detectChanges();
      },
    });
  }

  loadSchedules(): void {
    this.loadingSchedules = true;
    this.selectedScheduleId = null;
    this.api.getAvailableSchedules(this.scheduleDate).subscribe({
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

  send(): void {
    if (!this.canSubmit) {
      this.error = 'Un reto interno debe incluir una fecha y hora propuesta.';
      return;
    }

    this.saving = true;
    this.error = '';
    const proposedDateTime = this.proposedDate && this.proposedTime
      ? `${this.proposedDate}T${this.proposedTime}:00`
      : null;

    this.api.sendChallenge({
      challengedTeamId: this.challengedTeamId,
      message: this.message.trim() || undefined,
      proposedDateTime,
      courtScheduleId: this.selectedScheduleId,
      isExternal: this.isExternal,
    }).subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigate(['/cliente/equipos', this.myTeamId]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.message ?? 'No se pudo enviar el reto.';
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
