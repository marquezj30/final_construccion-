import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe } from '../../core/i18n.pipe';

@Component({
  selector: 'app-client-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './client-shell.html',
  styleUrl: '../admin-shell/admin-shell.scss',
})
export class ClientShell {
  private readonly auth = inject(AuthService);

  isMenuOpen = false;
  readonly currentUser = this.auth.currentUser();

  readonly navItems = [
    { labelKey: 'Inicio', route: '/cliente/inicio', icon: 'dashboard' },
    { labelKey: 'Mis reservas', route: '/cliente/reservas', icon: 'calendar' },
    { labelKey: 'Mis equipos', route: '/cliente/equipos', icon: 'ball' },
  ];

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.auth.logout();
  }
}
