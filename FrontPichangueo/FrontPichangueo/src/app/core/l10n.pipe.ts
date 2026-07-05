import { Pipe, PipeTransform, inject } from '@angular/core';
import { L10nService } from './l10n.service';

@Pipe({
  name: 'money',
  standalone: true,
  pure: false,
})
export class MoneyPipe implements PipeTransform {
  private readonly l10n = inject(L10nService);

  transform(value: number | string | null | undefined, currency?: string): string {
    return this.l10n.currency(value, currency);
  }
}

@Pipe({
  name: 'localDate',
  standalone: true,
  pure: false,
})
export class LocalDatePipe implements PipeTransform {
  private readonly l10n = inject(L10nService);

  transform(value: string | Date | null | undefined): string {
    return this.l10n.date(value);
  }
}

@Pipe({
  name: 'localDateTime',
  standalone: true,
  pure: false,
})
export class LocalDateTimePipe implements PipeTransform {
  private readonly l10n = inject(L10nService);

  transform(value: string | Date | null | undefined): string {
    return this.l10n.dateTime(value);
  }
}
