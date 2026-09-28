# Vitrine (storefront)

Site public d'une boutique : produits en stock, contacts, panier et commande sur WhatsApp.
Une seule application sert **toutes** les boutiques : `https://<domaine-vitrine>/<slug-de-la-boutique>`.
La vitrine d'une boutique s'active depuis l'administration (fiche entreprise → bouton globe).

Angular 18 avec rendu serveur (SSR) : pages indexables, aperçus de partage WhatsApp/Facebook,
affichage rapide sur mobile. Les données viennent de l'API publique Laravel `/api/public/storefront/{slug}`.

## Développement

```bash
npm install
npm start                  # http://localhost:4300 (API attendue sur http://localhost:8000/api)
```

Côté Laravel (`back-refonte/.env`) : `STOREFRONT_URL=http://localhost:4300` (liens affichés et CORS).

## Production (https://store.niangdev.com)

Même chaîne que `back-refonte` et `front-refonte` : un push sur `main` construit l'image
`ghcr.io/app-niangdev/storefront-komkom` (GitHub Actions), puis le VPS fait
`docker compose pull storefront && docker compose up -d storefront` dans `/opt/komkom`.

Mise en place (une seule fois) :

1. Ajouter le service de [docker/docker-compose.storefront.yml](docker/docker-compose.storefront.yml)
   dans `/opt/komkom/docker-compose.yml` et `STOREFRONT_SSR_KEY=<openssl rand -hex 32>` dans `/opt/komkom/.env`.
2. Backend (`.env` du conteneur) : `STOREFRONT_URL=https://store.niangdev.com` et la même `STOREFRONT_SSR_KEY`.
3. Nginx de l'hôte : [docker/nginx-store.niangdev.com.conf](docker/nginx-store.niangdev.com.conf), puis
   `certbot --nginx -d store.niangdev.com`.
4. Secrets du dépôt GitHub : les mêmes que les deux autres dépôts (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN`, `GHCR_USERNAME`).

| Variable | Rôle |
|---|---|
| `PORT` | Port du serveur Node (4300 par défaut) |
| `API_URL` | Adresse publique de l'API (`https://backendkomkom.niangdev.com/api`), transmise au navigateur |
| `API_INTERNAL_URL` | Facultatif : adresse utilisée par le rendu serveur seul (`http://backend/api` sur le réseau Docker). Même chemin qu'`API_URL` |
| `STOREFRONT_SSR_KEY` | Même valeur que dans le backend : quota de requêtes dédié au serveur SSR |
| `SSR_CACHE_SECONDS` | Durée du cache mémoire des pages rendues (30 par défaut, 0 pour désactiver) |
| `SSR_CACHE_MAX_ENTRIES` | Nombre maximum de pages en cache (500 par défaut) |

Le serveur compresse les réponses (gzip), met en cache un an les fichiers hachés du build,
garde 30 s en mémoire les pages rendues (en-tête `X-Cache: HIT/MISS`), abandonne un appel API
au-delà de 8 s, renvoie un vrai `404` pour une vitrine ou un produit indisponible et expose
`/healthz` pour Docker. L'image ne contient que `dist/` (le serveur est empaqueté, sans `node_modules`).

## Organisation

- `src/app/core` : API, panier (localStorage, un panier par boutique), thème calculé depuis les
  couleurs de la boutique (contraste garanti), SEO, jetons SSR.
- `src/app/pages` : coque de boutique (en-tête, pied, panier), catalogue (filtres et pagination
  dans l'URL), fiche produit, page introuvable.
- `src/app/shared` : carte produit, panier latéral, logo.
