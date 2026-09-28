import { APP_BASE_HREF } from '@angular/common';
import { HTTP_TRANSFER_CACHE_ORIGIN_MAP } from '@angular/common/http';
import { StaticProvider } from '@angular/core';
import { CommonEngine } from '@angular/ssr';
import compression from 'compression';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { SERVER_API_INTERNAL_URL, SERVER_API_URL, SERVER_RESPONSE, SERVER_STOREFRONT_KEY } from './src/app/core/tokens';

interface CachedPage {
  html: string;
  expires: number;
}

const trimUrl = (url: string | undefined) => (url ?? '').trim().replace(/\/+$/, '');

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  // Adresse publique de l'API Laravel (transmise au navigateur) et clé SSR (quota dédié)
  const apiUrl = trimUrl(process.env['API_URL']) || 'http://localhost:8000/api';
  const storefrontKey = process.env['STOREFRONT_SSR_KEY'] || '';

  // Adresse interne facultative (ex. http://backend/api sur le réseau Docker) : le rendu serveur
  // n'a plus à ressortir par Internet. Le cache de transfert associe les deux origines pour que
  // le navigateur réutilise les réponses sans les redemander.
  const serverProviders: StaticProvider[] = [
    { provide: SERVER_API_URL, useValue: apiUrl },
    ...(storefrontKey ? [{ provide: SERVER_STOREFRONT_KEY, useValue: storefrontKey }] : []),
  ];
  const internalUrl = trimUrl(process.env['API_INTERNAL_URL']);
  if (internalUrl) {
    const internal = new URL(internalUrl);
    const external = new URL(apiUrl);
    if (internal.pathname === external.pathname) {
      serverProviders.push(
        { provide: SERVER_API_INTERNAL_URL, useValue: internalUrl },
        { provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP, useValue: { [internal.origin]: external.origin } },
      );
    } else {
      console.warn(`API_INTERNAL_URL ignorée : son chemin (${internal.pathname}) doit être identique à celui d'API_URL (${external.pathname}).`);
    }
  }

  // Cache mémoire des pages rendues : le HTML ne dépend pas du visiteur (panier côté navigateur).
  // Une page populaire n'est rendue qu'une fois par période, et les rendus simultanés sont partagés.
  const cacheSeconds = Math.max(0, Number(process.env['SSR_CACHE_SECONDS'] ?? 30));
  const cacheMaxEntries = Math.max(1, Number(process.env['SSR_CACHE_MAX_ENTRIES'] ?? 500));
  const pageCache = new Map<string, CachedPage>();
  const pending = new Map<string, Promise<{ html: string; status: number }>>();

  // Derrière Nginx : protocole et hôte d'origine (liens de partage, og:url)
  server.set('trust proxy', true);
  server.disable('x-powered-by');
  server.use(compression());

  // Sonde de disponibilité (Docker, supervision)
  server.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.send('ok');
  });

  // Fichiers du build : noms hachés -> cache d'un an ; autres fichiers (favicon...) -> un jour
  server.get('**', express.static(browserDistFolder, {
    index: false,
    setHeaders: (res, path) => {
      const hashed = /-[A-Z0-9]{8}\.[a-z0-9]+$/.test(path);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=86400');
    },
  }));

  const render = (url: string, baseUrl: string, res: express.Response) =>
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: SERVER_RESPONSE, useValue: res },
          ...serverProviders,
        ],
      })
      .then((html) => ({ html, status: res.statusCode }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    const url = `${protocol}://${headers.host}${originalUrl}`;

    const cached = cacheSeconds ? pageCache.get(url) : undefined;
    if (cached && cached.expires > Date.now()) {
      res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`);
      res.setHeader('X-Cache', 'HIT');
      res.send(cached.html);
      return;
    }

    let rendering = pending.get(url);
    if (!rendering) {
      rendering = render(url, baseUrl, res).finally(() => pending.delete(url));
      pending.set(url, rendering);
    }

    rendering
      .then(({ html, status }) => {
        // Stock et prix bougent : cache court, jamais pour une page introuvable
        if (status === 200 && cacheSeconds) {
          if (pageCache.size >= cacheMaxEntries) {
            pageCache.delete(pageCache.keys().next().value!);
          }
          pageCache.delete(url);
          pageCache.set(url, { html, expires: Date.now() + cacheSeconds * 1000 });
        }
        res.status(status);
        res.setHeader('Cache-Control', status === 200 ? `public, max-age=${cacheSeconds}` : 'no-store');
        res.setHeader('X-Cache', 'MISS');
        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4300;

  // Start up the Node server
  const server = app().listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });

  // Arrêt propre (docker stop, redéploiement) : on termine les requêtes en cours
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

run();
