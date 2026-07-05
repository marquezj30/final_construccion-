import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, CourtPayload } from '../../../core/api.service';
import { Court } from '../../../core/models';

@Component({
  selector: 'app-court-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './court-form.html',
  styleUrl: './court-form.scss',
})
export class CourtForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly courtId = Number(this.route.snapshot.paramMap.get('id'));
  readonly isEdit = this.route.snapshot.routeConfig?.path === 'canchas/editar' || Boolean(this.courtId);
  courts: Court[] = [];
  selectedCourtId = 0;
  selectedFileName = '';
  photoPreviewUrl = '';
  loading = true;
  saving = false;
  error = '';
  form: Partial<Court> = this.createEmptyCourt();

  get nextCourtNumber(): number {
    return Math.max(...this.courts.map((court) => court.number), 0) + 1;
  }

  ngOnInit(): void {
    this.api.getCourts().subscribe({
      next: (courts) => {
        this.courts = courts;
        this.loading = false;

        if (!this.isEdit) {
          this.form = { ...this.createEmptyCourt(), number: this.nextCourtNumber };
          this.cdr.detectChanges();
          return;
        }

        const selected = this.courts.find((court) => court.id === this.courtId) ?? this.courts[0];
        if (selected) {
          this.applyCourt(selected);
          this.cdr.detectChanges();
          return;
        }

        this.error = 'No hay canchas registradas para editar.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar las canchas desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }

  onCourtChange(courtId: number | string): void {
    const court = this.courts.find((item) => item.id === Number(courtId));

    if (!court) {
      return;
    }

    this.applyCourt(court);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.selectedFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      this.photoPreviewUrl = result;
      this.form.photoUrl = file.name;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    this.saving = true;
    this.error = '';
    const payload = this.toPayload();
    const request = this.isEdit
      ? this.api.updateCourt(this.selectedCourtId, payload)
      : this.api.createCourt(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigateByUrl('/admin/canchas');
      },
      error: () => {
        this.saving = false;
        this.error = 'No se pudo guardar la cancha en Azure.';
        this.cdr.detectChanges();
      },
    });
  }

  private applyCourt(court: Court): void {
    this.selectedCourtId = court.id;
    this.form = { ...court };
    this.photoPreviewUrl = court.photoUrl;
    this.selectedFileName = court.photoUrl;
  }

  private createEmptyCourt(): Partial<Court> {
    return {
      name: '',
      number: 1,
      description: '',
      surfaceType: 'Sintetica',
      playerCapacity: 12,
      address: '',
      gps: '',
      photoUrl: '',
    };
  }

  private toPayload(): CourtPayload {
    return {
      name: String(this.form.name ?? '').trim(),
      number: Number(this.form.number || this.nextCourtNumber),
      description: String(this.form.description ?? ''),
      surfaceType: String(this.form.surfaceType ?? ''),
      playerCapacity: Number(this.form.playerCapacity ?? 0),
      address: String(this.form.address ?? ''),
      gps: String(this.form.gps ?? ''),
      photoUrl: String(this.form.photoUrl ?? ''),
    };
  }
}
