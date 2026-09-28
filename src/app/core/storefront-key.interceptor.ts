import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { timeout } from 'rxjs';
import { SERVER_STOREFRONT_KEY } from './tokens';

/** Au-delà, le rendu serveur abandonne l'appel plutôt que de bloquer la page. */
const SERVER_TIMEOUT_MS = 8000;

/**
 * Côté serveur uniquement : identifie le rendu SSR auprès de l'API (limite de débit dédiée)
 * et borne la durée des appels.
 */
export const storefrontKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return next(req);
  }
  const key = inject(SERVER_STOREFRONT_KEY, { optional: true });
  return next(key ? req.clone({ setHeaders: { 'X-Storefront-Key': key } }) : req).pipe(timeout(SERVER_TIMEOUT_MS));
};
