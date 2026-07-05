import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

const tokenKey = 'pichangueo_access_token';
const roleKey = 'pichangueo_role';

const normalizeRole = (role: string | null): 'admin' | 'client' => {
  const normalized = (role ?? 'client').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'administrator' || normalized === 'administrador'
    ? 'admin'
    : 'client';
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem(tokenKey);
  const role = localStorage.getItem(roleKey);

  if (token && normalizeRole(role) === 'admin') {
    return true;
  }

  return router.parseUrl('/login');
};

export const clientGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem(tokenKey);
  const role = localStorage.getItem(roleKey);

  if (token && normalizeRole(role) === 'client') {
    return true;
  }

  return router.parseUrl('/login');
};
