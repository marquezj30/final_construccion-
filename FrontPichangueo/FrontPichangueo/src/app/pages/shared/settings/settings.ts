import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { I18nService, AppLanguage } from '../../../core/i18n.service';
import { TranslatePipe } from '../../../core/i18n.pipe';
import { L10nService } from '../../../core/l10n.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './settings.html',
})
export class Settings {
  readonly i18n = inject(I18nService);
  readonly l10n = inject(L10nService);
  readonly sampleDate = new Date(2026, 5, 25, 18, 30);
  readonly sampleAmount = 180;
  readonly sampleNumber = 12540.75;

  setLanguage(language: AppLanguage): void {
    this.i18n.setLanguage(language);
    this.l10n.setCurrency(this.l10n.currencyForLanguage(language));
  }
}
