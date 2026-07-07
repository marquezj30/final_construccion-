import { Injectable, effect, inject, signal } from '@angular/core';
import { AppLanguage, I18nService } from './i18n.service';

export type AppCurrency = 'PEN' | 'USD' | 'BRL';

export interface CurrencyOption {
  code: AppCurrency;
  label: string;
  localeHint: string;
  penRate: number;
}

const CURRENCY_STORAGE_KEY = 'pichangueo_currency';

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'PEN', label: 'Sol peruano', localeHint: 'Peru', penRate: 1 },
  { code: 'USD', label: 'Dolar estadounidense', localeHint: 'Estados Unidos', penRate: 3.422 },
  { code: 'BRL', label: 'Real brasileno', localeHint: 'Brasil', penRate: 0.6609 },
];

const LANGUAGE_CURRENCY: Record<AppLanguage, AppCurrency> = {
  es: 'PEN',
  en: 'USD',
  pt: 'BRL',
};

@Injectable({ providedIn: 'root' })
export class L10nService {
  private readonly i18n = inject(I18nService);
  readonly currencies = CURRENCY_OPTIONS;
  readonly currentCurrency = signal<AppCurrency>(this.readStoredCurrency());

  constructor() {
    effect(() => {
      localStorage.setItem(CURRENCY_STORAGE_KEY, this.currentCurrency());
    });
  }

  get locale(): string {
    return this.i18n.locale;
  }

  currency(value: number | string | null | undefined, currency: string = this.currentCurrency()): string {
    const amount = this.convertFromPen(Number(value ?? 0), currency);
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  }

  setCurrency(currency: AppCurrency): void {
    this.currentCurrency.set(currency);
  }

  currencyForLanguage(language: AppLanguage): AppCurrency {
    return LANGUAGE_CURRENCY[language];
  }

  exchangeRateLabel(): string {
    const currency = this.currentCurrency();
    if (currency === 'PEN') return '1 PEN = 1 PEN';
    const option = this.currencyOption(currency);
    return `1 ${currency} = ${this.number(option.penRate)} PEN`;
  }

  number(value: number | string | null | undefined): string {
    return new Intl.NumberFormat(this.locale).format(Number(value ?? 0));
  }

  date(value: string | Date | null | undefined): string {
    const date = this.parseDate(value);
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  dateTime(value: string | Date | null | undefined): string {
    const date = this.parseDate(value);
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  dayName(index: number): string {
    const base = new Date(Date.UTC(2026, 5, 21 + index));
    const label = new Intl.DateTimeFormat(this.locale, { weekday: 'long', timeZone: 'UTC' }).format(base);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  private parseDate(value: string | Date | null | undefined): Date {
    if (value instanceof Date) return value;
    if (!value) return new Date();
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    return new Date(normalized);
  }

  private readStoredCurrency(): AppCurrency {
    return this.currencyForLanguage(this.i18n.currentLanguage());
  }

  private convertFromPen(amount: number, currency: string): number {
    return amount / this.currencyOption(currency).penRate;
  }

  private currencyOption(currency: string): CurrencyOption {
    return this.currencies.find((option) => option.code === currency) ?? this.currencies[0];
  }
}
