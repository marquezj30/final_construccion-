import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { LocalDatePipe } from '../../../core/l10n.pipe';
import { ClientSearchResult, Team, TeamMember, TeamRating } from '../../../core/models';

const STAR_SCALE = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-team-detail',
  imports: [CommonModule, FormsModule, RouterLink, LocalDatePipe],
  templateUrl: './team-detail.html',
})
export class TeamDetail implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  readonly currentUser = this.auth.currentUser();
  readonly starScale = STAR_SCALE;
  team: Team | undefined;
  loading = true;
  saving = false;
  error = '';
  success = '';
  editName = '';
  realUsername = '';
  ghostName = '';
  clientSuggestions: ClientSearchResult[] = [];
  showSuggestions = false;

  ratings: TeamRating[] = [];
  loadingRatings = true;
  ratingsError = '';

  private readonly searchSubject = new Subject<string>();

  get myMember(): TeamMember | undefined {
    return this.team?.members?.find((member) => member.userId === this.currentUser.id);
  }

  get isLeader(): boolean {
    return this.myMember?.role === 'leader';
  }

  ngOnInit(): void {
    this.loadTeam();
    this.loadRatings();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => query.trim().length >= 2
        ? this.api.searchClients(query.trim())
        : [[]]),
    ).subscribe({
      next: (results) => {
        this.clientSuggestions = results as ClientSearchResult[];
        this.showSuggestions = this.clientSuggestions.length > 0;
        this.cdr.detectChanges();
      },
    });
  }

  loadTeam(): void {
    this.loading = true;
    this.api.getTeam(this.teamId).subscribe({
      next: (team) => {
        this.team = team;
        this.editName = team.teamName;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el equipo.';
        this.cdr.detectChanges();
      },
    });
  }

  updateName(): void {
    this.runAction(this.api.updateTeam(this.teamId, { teamName: this.editName.trim() }), 'Nombre actualizado.');
  }

  onRealUsernameInput(): void {
    this.searchSubject.next(this.realUsername);
  }

  selectSuggestion(result: ClientSearchResult): void {
    this.realUsername = result.username;
    this.clientSuggestions = [];
    this.showSuggestions = false;
  }

  addRealMember(): void {
    this.clientSuggestions = [];
    this.showSuggestions = false;
    this.runAction(this.api.addRealTeamMember(this.teamId, this.realUsername.trim()), 'Miembro real agregado.');
    this.realUsername = '';
  }

  addGhostMember(): void {
    this.runAction(this.api.addGhostTeamMember(this.teamId, this.ghostName.trim()), 'Miembro fantasma agregado.');
    this.ghostName = '';
  }

  removeMember(member: TeamMember): void {
    this.runAction(this.api.removeTeamMember(this.teamId, member.memberId), 'Miembro expulsado.');
  }

  promoteMember(member: TeamMember): void {
    this.runAction(this.api.promoteTeamMember(this.teamId, member.memberId), 'Liderazgo transferido.');
  }

  leaveTeam(): void {
    this.runAction(this.api.leaveTeam(this.teamId), 'Saliste del equipo.');
  }

  private loadRatings(): void {
    this.loadingRatings = true;
    this.ratingsError = '';
    this.api.getTeamRatings(this.teamId).subscribe({
      next: (ratings) => {
        this.ratings = ratings;
        this.loadingRatings = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingRatings = false;
        this.ratingsError = 'No se pudieron cargar las calificaciones.';
        this.cdr.detectChanges();
      },
    });
  }

  private runAction(request: Observable<unknown>, message: string): void {
    this.saving = true;
    this.error = '';
    this.success = '';
    request.subscribe({
      next: () => {
        this.saving = false;
        this.success = message;
        this.cdr.detectChanges();
        this.loadTeam();
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 404) {
          this.error = 'No se encontró el usuario o recurso solicitado.';
        } else if (err.status === 403) {
          this.error = 'No tienes permiso. Solo el líder puede realizar esta acción.';
        } else if (err.status === 409) {
          this.error = 'El usuario ya es miembro activo de este equipo.';
        } else if (err.status === 400) {
          this.error = err.error ?? 'Datos inválidos. Verifica la información ingresada.';
        } else {
          this.error = `No se pudo completar la acción (error ${err.status ?? 'desconocido'}).`;
        }
        this.cdr.detectChanges();
      },
    });
  }
}
