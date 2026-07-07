import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { dayNames, timeLabel } from '../../../core/formatters';
import { MoneyPipe } from '../../../core/l10n.pipe';
import { AvailableSchedule, Court } from '../../../core/models';

interface ScheduleDay {
  date: string;
  label: string;
  schedules: AvailableSchedule[];
}

@Component({
  selector: 'app-client-court-detail',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe],
  templateUrl: './client-court-detail.html',
})
export class ClientCourtDetail implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dayNames = dayNames;
  readonly timeLabel = timeLabel;
  readonly courtId = Number(this.route.snapshot.paramMap.get('id'));
  court: Court | undefined;
  selectedDate = this.route.snapshot.queryParamMap.get('fecha') || this.toDateInput(new Date());
  week: ScheduleDay[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadCourtWeek();
  }

  loadCourtWeek(): void {
    this.loading = true;
    this.error = '';
    const dates = this.nextSevenDates(this.selectedDate);
    const dayRequests: Observable<AvailableSchedule[]>[] = dates.map((date) => (
      this.api.getAvailableSchedules(date, this.courtId)
    ));

    forkJoin({
      court: this.api.getCourt(this.courtId),
      days: forkJoin(dayRequests),
    }).subscribe({
      next: ({ court, days }) => {
        this.court = court;
        this.week = dates.map((date, index) => ({
          date,
          label: `${dayNames[new Date(`${date}T00:00:00`).getDay()]} ${date.slice(8, 10)}/${date.slice(5, 7)}`,
          schedules: days[index],
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar la cancha disponible.';
        this.cdr.detectChanges();
      },
    });
  }

  maxDuration(schedule: AvailableSchedule): number {
    return Math.max(1, Math.floor((this.toMinutes(schedule.endTime) - this.toMinutes(schedule.startTime)) / 60));
  }

  private nextSevenDates(start: string): string[] {
    const dates: string[] = [];
    const base = new Date(`${start}T00:00:00`);

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(base);
      date.setDate(base.getDate() + index);
      dates.push(this.toDateInput(date));
    }

    return dates;
  }

  private toDateInput(date: Date): string {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
