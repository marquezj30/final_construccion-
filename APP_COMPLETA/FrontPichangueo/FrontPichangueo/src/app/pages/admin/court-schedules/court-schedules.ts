import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, SchedulePayload } from '../../../core/api.service';
import { dayNames, timeLabel } from '../../../core/formatters';
import { MoneyPipe } from '../../../core/l10n.pipe';
import { Court, CourtSchedule } from '../../../core/models';

@Component({
  selector: 'app-court-schedules',
  imports: [CommonModule, FormsModule, MoneyPipe],
  templateUrl: './court-schedules.html',
})
export class CourtSchedules implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly dayNames = dayNames;
  readonly selectedCourtId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  schedules: CourtSchedule[] = [];
  courts: Court[] = [];
  loading = true;
  saving = false;
  error = '';
  showForm = false;
  editingScheduleId: number | undefined;

  form: SchedulePayload & { courtId: number } = this.emptyForm();

  get selectedCourt(): Court | undefined {
    return this.courts.find((court) => court.id === this.selectedCourtId);
  }

  ngOnInit(): void {
    this.loadData();
  }

  openForm(schedule?: CourtSchedule): void {
    this.editingScheduleId = schedule?.id;
    this.form = schedule
      ? {
          courtId: schedule.courtId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: this.toInputTime(schedule.startTime),
          endTime: this.toInputTime(schedule.endTime),
          costPerHour: schedule.costPerHour,
        }
      : this.emptyForm();

    if (!schedule && this.selectedCourtId) this.form.courtId = this.selectedCourtId;
    this.showForm = true;
    this.error = '';
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingScheduleId = undefined;
    this.error = '';
  }

  saveSchedule(): void {
    this.saving = true;
    this.error = '';
    const { courtId, ...payload } = this.form;
    const request = this.editingScheduleId
      ? this.api.updateSchedule(courtId, this.editingScheduleId, payload)
      : this.api.createSchedule(courtId, payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editingScheduleId = undefined;
        this.loadSchedules();
      },
      error: (err) => {
        this.saving = false;
        this.error = err.status === 409
          ? 'Ya existe un horario que se solapa para esa cancha.'
          : 'No se pudo guardar el horario.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteSchedule(schedule: CourtSchedule): void {
    this.error = '';
    this.api.deleteSchedule(schedule.courtId, schedule.id).subscribe({
      next: () => {
        this.loadSchedules();
      },
      error: (err) => {
        this.error = err.status === 409
          ? 'No se puede eliminar un horario con reservas activas.'
          : 'No se pudo eliminar el horario.';
        this.cdr.detectChanges();
      },
    });
  }

  courtLabel(schedule: CourtSchedule): string {
    const court = this.courts.find((item) => item.id === schedule.courtId);
    return court?.name ?? schedule.courtName ?? `Cancha ${schedule.courtNumber}`;
  }

  readonly timeLabel = timeLabel;

  private emptyForm(): SchedulePayload & { courtId: number } {
    return { courtId: 0, dayOfWeek: 1, startTime: '18:00', endTime: '19:00', costPerHour: 80 };
  }

  private loadData(): void {
    this.api.getCourts().subscribe({
      next: (courts) => {
        this.courts = courts;
        if (this.selectedCourtId) {
          this.form.courtId = this.selectedCourtId;
        } else if (courts.length > 0) {
          this.form.courtId = courts[0].id;
        }
        this.loadSchedules();
      },
      error: () => {
        this.loadSchedules();
      },
    });
  }

  private loadSchedules(): void {
    this.loading = true;
    const request = this.selectedCourtId
      ? this.api.getSchedules(this.selectedCourtId)
      : this.api.getAllSchedules();

    request.subscribe({
      next: (schedules) => {
        this.schedules = schedules;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los horarios desde Azure.';
        this.cdr.detectChanges();
      },
    });
  }

  private toInputTime(value: string): string {
    return value.slice(0, 5);
  }
}
