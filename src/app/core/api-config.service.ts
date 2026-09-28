import { Injectable, TransferState, inject, makeStateKey } from '@angular/core';
import { SERVER_API_INTERNAL_URL, SERVER_API_URL } from './tokens';

const API_URL_KEY = makeStateKey<string>('storefront.apiUrl');
const DEV_API_URL = 'http://localhost:8000/api';

/**
 * Adresse de l'API : lue par le serveur SSR dans son environnement, puis transmise au
 * navigateur dans la page (TransferState) : un seul build pour tous les environnements.
 * Le serveur peut appeler l'API par une adresse interne (API_INTERNAL_URL) ; le navigateur
 * reçoit toujours l'adresse publique.
 */
@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  readonly baseUrl: string;

  constructor() {
    const state = inject(TransferState);
    const serverUrl = inject(SERVER_API_URL, { optional: true });
    if (serverUrl) {
      state.set(API_URL_KEY, serverUrl);
      this.baseUrl = inject(SERVER_API_INTERNAL_URL, { optional: true }) ?? serverUrl;
    } else {
      this.baseUrl = state.get(API_URL_KEY, DEV_API_URL);
    }
  }
}
