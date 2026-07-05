import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { Team } from '../../../core/models';

@Component({
  selector: 'app-client-teams',
  imports: [CommonModule, RouterLink],
  templateUrl: './client-teams.html',
})
export class ClientTeams implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = this.auth.currentUser();
  teams: Team[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.api.getMyTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar tus equipos.';
        this.cdr.detectChanges();
      },
    });
  }

  roleIn(team: Team): string {
    const member = team.members?.find((item) => item.userId === this.currentUser.id);
    return member?.role === 'leader' ? 'Lider' : 'Jugador';
  }
}
