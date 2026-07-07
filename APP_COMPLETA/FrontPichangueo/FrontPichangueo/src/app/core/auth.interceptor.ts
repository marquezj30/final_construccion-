import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('pichangueo_access_token');
  const language = localStorage.getItem('pichangueo_language') ?? 'es';
  const locale = language === 'en' ? 'en-US' : language === 'pt' ? 'pt-BR' : 'es-PE';

  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  const headers: Record<string, string> = {
    'Accept-Language': locale,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(
    req.clone({
      setHeaders: headers,
    }),
  ).pipe(
    catchError((error) => {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('pichangueo_access_token');
        localStorage.removeItem('pichangueo_refresh_token');
        localStorage.removeItem('pichangueo_role');
        localStorage.removeItem('pichangueo_user_name');
        localStorage.removeItem('pichangueo_user_email');
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
