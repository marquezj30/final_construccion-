import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { Team } from '../../../core/models';

@Component({
  selector: 'app-team-search',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-search.html',
})
export class TeamSearch implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  teams: Team[] = [];
  search = '';
  loading = true;
  savingTeamId = 0;
  error = '';
  success = '';

  get filteredTeams(): Team[] {
    const value = this.search.trim().toLowerCase();
    if (!value) return this.teams;
    return this.teams.filter((team) =>
      [team.teamName, team.leaderName].some((item) => item.toLowerCase().includes(value)),
    );
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  join(team: Team): void {
    this.savingTeamId = team.id;
    this.error = '';
    this.success = '';
    this.api.joinTeam(team.id).subscribe({
      next: () => {
        this.savingTeamId = 0;
        this.success = `Ahora eres miembro de ${team.teamName}.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingTeamId = 0;
        this.error = err.status === 409
          ? 'Ya eres miembro de ese equipo.'
          : 'No se pudo unir al equipo.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadTeams(): void {
    this.api.getTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los equipos activos.';
        this.cdr.detectChanges();
      },
    });
  }
}
