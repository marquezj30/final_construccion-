import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, timeout } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { UserRole } from './models';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface TokenPayload {
  [key: string]: string | number | undefined;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

export interface RegisterPayload {
  username: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenKey = 'pichangueo_access_token';
  private readonly refreshTokenKey = 'pichangueo_refresh_token';
  private readonly roleKey = 'pichangueo_role';
  private readonly userNameKey = 'pichangueo_user_name';
  private readonly userEmailKey = 'pichangueo_user_email';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(email: string, password: string): Observable<UserRole> {
    return this.http.post<TokenResponse>(`${API_BASE_URL}/Auth/login`, { email, password }).pipe(
      timeout(20000),
      map((tokens) => {
        const payload = this.getPayloadFromToken(tokens.accessToken);
        const role = this.getRoleFromPayload(payload);
        const userName = this.getNameFromPayload(payload, email);
        const userEmail = this.getEmailFromPayload(payload, email);

        localStorage.setItem(this.accessTokenKey, tokens.accessToken);
        localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);
        localStorage.setItem(this.roleKey, role);
        localStorage.setItem(this.userNameKey, userName);
        localStorage.setItem(this.userEmailKey, userEmail);
        return role;
      }),
      tap((role) => {
        if (role === 'admin') {
          void this.router.navigateByUrl('/admin/dashboard');
          return;
        }

        void this.router.navigateByUrl('/cliente/inicio');
      }),
    );
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/Auth/register`, payload).pipe(
      tap(() => {
        void this.router.navigate(['/login'], {
          queryParams: { registered: 'true' },
        });
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.userNameKey);
    localStorage.removeItem(this.userEmailKey);
    void this.router.navigateByUrl('/login');
  }

  currentUser(): AuthenticatedUser {
    const token = localStorage.getItem(this.accessTokenKey);
    const payload = token ? this.getPayloadFromToken(token) : {};
    const email = localStorage.getItem(this.userEmailKey) || this.getEmailFromPayload(payload, '');
    const name = localStorage.getItem(this.userNameKey) || this.getNameFromPayload(payload, email);
    const role = (localStorage.getItem(this.roleKey) as UserRole | null) || this.getRoleFromPayload(payload);

    return {
      id: this.getIdFromPayload(payload),
      name,
      email,
      role,
      initials: this.getInitials(name),
    };
  }

  private getPayloadFromToken(token: string): TokenPayload {
    try {
      return JSON.parse(atob(this.toBase64(token.split('.')[1] ?? '')));
    } catch {
      return {};
    }
  }

  private getRoleFromPayload(payload: TokenPayload): UserRole {
    const rawRole = String(
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      ?? payload['role']
      ?? 'client'
    ).trim().toLowerCase();

    if (rawRole === 'admin' || rawRole === 'administrator' || rawRole === 'administrador') {
      return 'admin';
    }

    return 'client';
  }

  private getIdFromPayload(payload: TokenPayload): number {
    const rawId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? payload['sub'] ?? 0;
    return Number(rawId) || 0;
  }

  private getNameFromPayload(payload: TokenPayload, fallback: string): string {
    const rawName = String(
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      ?? payload['name']
      ?? fallback
      ?? 'Administrador',
    ).trim();
    const cleanedName = rawName.replace(/^admin[_\s-]*/i, '').trim();
    const fromEmail = fallback ? fallback.split('@')[0] : 'Administrador';

    return cleanedName || fromEmail || 'Administrador';
  }

  private getEmailFromPayload(payload: TokenPayload, fallback: string): string {
    return String(
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
      ?? payload['email']
      ?? fallback
      ?? '',
    );
  }

  private getInitials(name: string): string {
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
    return initials || 'A';
  }

  private toBase64(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  }
}
