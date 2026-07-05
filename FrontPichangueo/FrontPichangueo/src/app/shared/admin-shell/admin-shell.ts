import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.pipe';

@Component({
  selector: 'app-admin-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly auth = inject(AuthService);

  isMenuOpen = false;
  readonly currentUser = this.auth.currentUser();

  readonly navItems = [
    { labelKey: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { labelKey: 'Canchas', route: '/admin/canchas', icon: 'ball' },
    { labelKey: 'Horarios', route: '/admin/horarios', icon: 'clock' },
    { labelKey: 'Reservas', route: '/admin/reservas', icon: 'calendar' },
    { labelKey: 'Pagos', route: '/admin/pagos', icon: 'wallet' },
  ];

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.auth.logout();
  }
}
