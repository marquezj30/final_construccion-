import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  username = '';
  name = '';
  email = '';
  phone = '';
  password = '';
  loading = false;
  error = '';

  constructor(private readonly auth: AuthService) {}

  submit(): void {
    this.loading = true;
    this.error = '';

    this.auth.register({
      username: this.username,
      name: this.name,
      email: this.email,
      phone: this.phone,
      password: this.password,
    }).subscribe({
      next: () => {
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo registrar el usuario. Revisa si el email o username ya existen.';
      },
    });
  }
}
