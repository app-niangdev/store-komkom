import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { SERVER_API_URL, SERVER_RESPONSE, SERVER_STOREFRONT_KEY } from './src/app/core/tokens';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  // Adresse de l'API Laravel et clé SSR (quota dédié) : fournies par l'environnement du serveur
  const apiUrl = (process.env['API_URL'] || 'http://localhost:8000/api').replace(/\/+$/, '');
  const storefrontKey = process.env['STOREFRONT_SSR_KEY'] || '';

  // Derrière Nginx : protocole et hôte d'origine (liens de partage, og:url)
  server.set('trust proxy', true);
  server.disable('x-powered-by');
  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Serve static files from /browser
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: SERVER_API_URL, useValue: apiUrl },
          { provide: SERVER_RESPONSE, useValue: res },
          ...(storefrontKey ? [{ provide: SERVER_STOREFRONT_KEY, useValue: storefrontKey }] : []),
        ],
      })
      .then((html) => {
        // Stock et prix bougent : cache court, jamais pour une page introuvable
        res.setHeader('Cache-Control', res.statusCode === 200 ? 'public, max-age=30' : 'no-store');
        res.send(html);
      })
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4300;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
