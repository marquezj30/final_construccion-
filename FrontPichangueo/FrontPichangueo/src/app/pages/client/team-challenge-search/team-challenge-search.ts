import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { Team } from '../../../core/models';

type ChallengeTab = 'buscar' | 'recomendados';

@Component({
  selector: 'app-team-challenge-search',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-challenge-search.html',
})
export class TeamChallengeSearch implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = this.auth.currentUser();
  tab: ChallengeTab = 'buscar';
  search = '';
  myTeam: Team | undefined;
  teams: Team[] = [];
  challengedTeamIds = new Set<number>();
  loading = true;
  isLeader = false;
  error = '';

  get searchResults(): Team[] {
    const value = this.search.trim().toLowerCase();
    if (!value) return this.teams;
    return this.teams.filter((team) => team.teamName.toLowerCase().includes(value));
  }

  get recommendedTeams(): Team[] {
    const myCount = this.myTeam?.memberCount ?? 0;
    return [...this.teams]
      .sort((a, b) => {
        const diffA = Math.abs(a.memberCount - myCount);
        const diffB = Math.abs(b.memberCount - myCount);
        if (diffA !== diffB) return diffA - diffB;
        return b.averageStars - a.averageStars;
      })
      .slice(0, 6);
  }

  ngOnInit(): void {
    this.api.getMyTeams().subscribe({
      next: (myTeams) => {
        this.myTeam = myTeams.find((team) =>
          team.members?.some((member) => member.userId === this.currentUser.id && member.role === 'leader'),
        );
        this.isLeader = Boolean(this.myTeam);

        if (!this.isLeader) {
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        forkJoin({
          teams: this.api.getTeams(),
          sent: this.api.getSentChallenges(),
        }).subscribe({
          next: ({ teams, sent }) => {
            this.teams = teams.filter((team) => team.id !== this.myTeam?.id);
            this.challengedTeamIds = new Set(sent.map((challenge) => challenge.challengedTeamId));
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading = false;
            this.error = 'No se pudieron cargar los equipos.';
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

  alreadyChallenged(team: Team): boolean {
    return this.challengedTeamIds.has(team.id);
  }
}
