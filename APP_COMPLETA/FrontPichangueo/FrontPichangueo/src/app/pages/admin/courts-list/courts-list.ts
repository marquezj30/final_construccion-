import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { Court } from '../../../core/models';

@Component({
  selector: 'app-courts-list',
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './courts-list.html',
})
export class CourtsList implements OnInit {
  courts: Court[] = [];
  loading = true;
  error = '';

  constructor(private readonly api: ApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCourts();
  }

  toggleCourtStatus(court: Court): void {
    this.api.updateCourtStatus(court.id, !court.status).subscribe({
      next: (updatedCourt) => {
        this.courts = this.courts.map((item) => item.id === updatedCourt.id ? updatedCourt : item);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo actualizar el estado de la cancha.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadCourts(): void {
    this.loading = true;
    this.error = '';

    this.api.getCourts().subscribe({
      next: (courts) => {
        this.courts = courts;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = 'No se pudieron cargar las canchas desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }
}
