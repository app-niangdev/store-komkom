import { Routes } from '@angular/router';
import { productResolver, productsResolver, storeResolver } from './core/resolvers';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: { kind: 'no-store' }
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/store-shell/store-shell.component').then((m) => m.StoreShellComponent),
    resolve: { data: storeResolver },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent),
        resolve: { page: productsResolver },
        runGuardsAndResolvers: 'paramsOrQueryParamsChange'
      },
      {
        path: 'produit/:id',
        loadComponent: () => import('./pages/product/product.component').then((m) => m.ProductComponent),
        resolve: { product: productResolver }
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
        data: { kind: 'page' }
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: { kind: 'no-store' }
  }
];
