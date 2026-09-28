import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { routes } from './app.routes';
import { storefrontKeyInterceptor } from './core/storefront-key.interceptor';

registerLocaleData(localeFr);

/** Page affichée (route la plus profonde) d'un état du routeur. */
function leaf(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? leaf(route.firstChild) : route;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Transition animée d'une page à l'autre (fiche produit ↔ catalogue) ; pas pour un simple
      // changement de filtre ou de recherche, qui doit rester instantané pendant la saisie
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const [a, b] = [leaf(from), leaf(to)];
          if (a.routeConfig === b.routeConfig && JSON.stringify(a.params) === JSON.stringify(b.params)) {
            transition.skipTransition();
          }
        }
      })
    ),
    provideHttpClient(withFetch(), withInterceptors([storefrontKeyInterceptor])),
    // Les réponses de l'API obtenues pendant le rendu serveur sont réutilisées par le navigateur
    provideClientHydration(withHttpTransferCacheOptions({ includePostRequests: false })),
    { provide: LOCALE_ID, useValue: 'fr' }
  ]
};
