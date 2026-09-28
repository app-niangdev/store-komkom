import { InjectionToken } from '@angular/core';
import type { Response } from 'express';

/** Adresse de l'API Laravel, fournie par le serveur SSR (variable d'environnement API_URL). */
export const SERVER_API_URL = new InjectionToken<string>('SERVER_API_URL');

/** Clé partagée avec l'API (quota élevé pour le serveur SSR) : jamais transmise au navigateur. */
export const SERVER_STOREFRONT_KEY = new InjectionToken<string>('SERVER_STOREFRONT_KEY');

/** Réponse Express en cours (SSR) : permet de renvoyer un vrai 404 aux moteurs de recherche. */
export const SERVER_RESPONSE = new InjectionToken<Response>('SERVER_RESPONSE');

/**
 * Adresse de l'API utilisée par le serveur SSR uniquement (ex. réseau Docker interne) :
 * évite l'aller-retour par Internet. Le navigateur utilise toujours SERVER_API_URL.
 */
export const SERVER_API_INTERNAL_URL = new InjectionToken<string>('SERVER_API_INTERNAL_URL');
