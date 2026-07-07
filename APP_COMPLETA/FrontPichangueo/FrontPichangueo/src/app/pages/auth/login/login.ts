import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../core/api.config';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  email = 'renzoRosqueton@pichangeo.com';
  password = '123Amigues';
  loading = false;
  error = '';
  readonly registered = this.route.snapshot.queryParamMap.get('registered') === 'true';

  loginWithAuth0(): void {
    window.location.href = `${API_BASE_URL}/oauth/auth0/login`;
  }

  submit(): void {
    this.loading = true;
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        if (error?.name === 'TimeoutError') {
          this.error = 'El servidor esta tardando demasiado. Verifica que el backend y Azure esten respondiendo.';
          return;
        }

        if (error?.status === 0) {
          this.error = 'No se pudo conectar con el backend. Verifica que este corriendo en http://localhost:5000.';
          return;
        }

        this.error = 'No se pudo iniciar sesion. Revisa el correo o la contraseña.';
      },
    });
  }
}
