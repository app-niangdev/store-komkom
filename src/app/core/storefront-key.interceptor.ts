import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SERVER_STOREFRONT_KEY } from './tokens';

/** Côté serveur uniquement : identifie le rendu SSR auprès de l'API (limite de débit dédiée). */
export const storefrontKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const key = inject(SERVER_STOREFRONT_KEY, { optional: true });
  return next(key ? req.clone({ setHeaders: { 'X-Storefront-Key': key } }) : req);
};
