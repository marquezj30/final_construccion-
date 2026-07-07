import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { dayNames, timeLabel } from '../../../core/formatters';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { MoneyPipe } from '../../../core/l10n.pipe';
import { AvailableSchedule } from '../../../core/models';

interface CourtAvailability {
  courtId: number;
  courtName: string;
  adminName: string;
  description: string;
  surfaceType: string;
  playerCapacity: number;
  address: string;
  minCost: number;
  schedules: AvailableSchedule[];
}

@Component({
  selector: 'app-client-home',
  imports: [CommonModule, FormsModule, RouterLink, MoneyPipe, TranslatePipe],
  templateUrl: './client-home.html',
})
export class ClientHome implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dayNames = dayNames;
  readonly timeLabel = timeLabel;
  selectedDate = this.toDateInput(new Date());
  search = '';
  loading = true;
  error = '';
  availableCourts: CourtAvailability[] = [];

  get filteredCourts(): CourtAvailability[] {
    const value = this.search.trim().toLowerCase();
    if (!value) return this.availableCourts;

    return this.availableCourts.filter((court) =>
      [court.courtName, court.adminName, court.surfaceType, court.address]
        .some((item) => item.toLowerCase().includes(value)),
    );
  }

  ngOnInit(): void {
    this.loadAvailableCourts();
  }

  loadAvailableCourts(): void {
    this.loading = true;
    this.error = '';

    this.api.getAvailableSchedules(this.selectedDate).subscribe({
      next: (schedules) => {
        this.availableCourts = this.groupSchedules(schedules);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar las canchas disponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  private groupSchedules(schedules: AvailableSchedule[]): CourtAvailability[] {
    const grouped = new Map<number, CourtAvailability>();

    for (const schedule of schedules) {
      const existing = grouped.get(schedule.courtId);
      if (existing) {
        existing.schedules.push(schedule);
        existing.minCost = Math.min(existing.minCost, schedule.costPerHour);
        continue;
      }

      grouped.set(schedule.courtId, {
        courtId: schedule.courtId,
        courtName: schedule.courtName,
        adminName: schedule.adminName,
        description: schedule.description,
        surfaceType: schedule.surfaceType,
        playerCapacity: schedule.playerCapacity,
        address: schedule.address,
        minCost: schedule.costPerHour,
        schedules: [schedule],
      });
    }

    return [...grouped.values()].sort((a, b) => a.courtName.localeCompare(b.courtName));
  }

  private toDateInput(date: Date): string {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
