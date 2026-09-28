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

## Production

```bash
npm run build
PORT=4300 API_URL=https://<api>/api STOREFRONT_SSR_KEY=<clé> node dist/storefront/server/server.mjs
```

| Variable | Rôle |
|---|---|
| `PORT` | Port du serveur Node (4300 par défaut) |
| `API_URL` | Adresse de l'API Laravel, transmise aussi au navigateur |
| `STOREFRONT_SSR_KEY` | Même valeur que dans `back-refonte/.env` : quota de requêtes dédié au serveur SSR (toutes les visites passent par sa seule IP) |

Côté Laravel : `STOREFRONT_URL=https://<domaine-vitrine>` et la même `STOREFRONT_SSR_KEY`.

Derrière Nginx, faire suivre `Host` et `X-Forwarded-Proto` (liens de partage corrects).
Le serveur renvoie un vrai `404` pour une vitrine ou un produit indisponible, et met les pages
en cache 30 secondes (`Cache-Control`).

## Organisation

- `src/app/core` : API, panier (localStorage, un panier par boutique), thème calculé depuis les
  couleurs de la boutique (contraste garanti), SEO, jetons SSR.
- `src/app/pages` : coque de boutique (en-tête, pied, panier), catalogue (filtres et pagination
  dans l'URL), fiche produit, page introuvable.
- `src/app/shared` : carte produit, panier latéral, logo.
