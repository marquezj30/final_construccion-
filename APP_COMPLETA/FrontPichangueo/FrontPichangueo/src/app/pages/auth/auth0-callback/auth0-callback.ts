import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-auth0-callback',
  template: `
    <main class="auth0-callback">
      @if (!error) {
        <p>Procesando inicio de sesión...</p>
      }
      @if (error) {
        <p class="error">{{ error }}</p>
      }
    </main>
  `,
  styles: [`
    .auth0-callback {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-size: 1.2rem;
      color: #071924;
    }
    .error {
      color: #c0392b;
      font-weight: 700;
    }
  `],
})
export class Auth0Callback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  error = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const errorMsg = params['error'];

    if (errorMsg) {
      this.error = decodeURIComponent(errorMsg);
      return;
    }

    const accessToken = params['accessToken'];
    const refreshToken = params['refreshToken'];
    const role = params['role'];
    const name = params['name'];
    const email = params['email'];

    if (!accessToken) {
      this.error = 'No se recibió el token de acceso.';
      return;
    }

    localStorage.setItem('pichangueo_access_token', accessToken);
    localStorage.setItem('pichangueo_refresh_token', refreshToken || '');
    localStorage.setItem('pichangueo_role', role || 'client');
    localStorage.setItem('pichangueo_user_name', name || '');
    localStorage.setItem('pichangueo_user_email', email || '');

    if (role === 'admin') {
      void this.router.navigateByUrl('/admin/dashboard');
    } else {
      void this.router.navigateByUrl('/cliente/inicio');
    }
  }
}
