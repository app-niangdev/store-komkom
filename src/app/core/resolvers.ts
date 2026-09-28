import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { StorefrontApiService } from './storefront-api.service';
import { Category, Page, Product, ProductQuery, ProductSort, Store } from './models';
import { StoreContextService } from './store-context.service';

export interface StoreData {
  store: Store;
  categories: Category[];
}

const SORTS: ProductSort[] = ['name', 'price_asc', 'price_desc', 'recent'];

/** Boutique + catégories ; null si la vitrine n'existe pas ou n'est pas en ligne. */
export const storeResolver: ResolveFn<StoreData | null> = (route) => {
  const api = inject(StorefrontApiService);
  const context = inject(StoreContextService);
  const slug = route.paramMap.get('slug') ?? '';

  return forkJoin({ store: api.store(slug), categories: api.categories(slug) }).pipe(
    map((data) => {
      context.set(data.store, data.categories);
      return data;
    }),
    catchError(() => of(null))
  );
};

/** Filtres du catalogue lus dans l'URL : ?page=2&q=...&cat=3&tri=price_asc (liens partageables). */
export function readQuery(route: ActivatedRouteSnapshot): ProductQuery {
  const params = route.queryParamMap;
  const sort = params.get('tri') as ProductSort;
  return {
    page: Math.max(1, Number(params.get('page')) || 1),
    search: (params.get('q') ?? '').trim().slice(0, 100),
    categoryId: Number(params.get('cat')) || null,
    sort: SORTS.includes(sort) ? sort : 'name'
  };
}

export const productsResolver: ResolveFn<Page<Product> | null> = (route) => {
  const slug = route.parent?.paramMap.get('slug') ?? '';
  return inject(StorefrontApiService).products(slug, readQuery(route)).pipe(catchError(() => of(null)));
};

export const productResolver: ResolveFn<Product | null> = (route) => {
  const slug = route.parent?.paramMap.get('slug') ?? '';
  const id = Number(route.paramMap.get('id'));
  return id ? inject(StorefrontApiService).product(slug, id).pipe(catchError(() => of(null))) : of(null);
};
