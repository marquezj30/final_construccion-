import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';

@Component({
  selector: 'app-team-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-form.html',
})
export class TeamForm {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  teamName = '';
  saving = false;
  error = '';

  createTeam(): void {
    const teamName = this.teamName.trim();
    if (!teamName) {
      this.error = 'Ingresa el nombre del equipo.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.api.createTeam({ teamName }).subscribe({
      next: (team) => {
        this.saving = false;
        void this.router.navigate(['/cliente/equipos', team.id]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.status === 409
          ? 'Ya eres lider de un equipo activo.'
          : 'No se pudo crear el equipo.';
        this.cdr.detectChanges();
      },
    });
  }
}
