import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { Category, Page, Product, ProductQuery, Store } from './models';

export const PER_PAGE = 24;

/** API publique de la vitrine (lecture seule, sans authentification). */
@Injectable({ providedIn: 'root' })
export class StorefrontApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfigService);

  private url(slug: string, path = ''): string {
    return `${this.config.baseUrl}/public/storefront/${encodeURIComponent(slug)}${path}`;
  }

  store(slug: string): Observable<Store> {
    return this.http.get<{ data: Store }>(this.url(slug)).pipe(map((res) => res.data));
  }

  categories(slug: string): Observable<Category[]> {
    return this.http.get<{ data: Category[] }>(this.url(slug, '/categories')).pipe(map((res) => res.data));
  }

  products(slug: string, query: ProductQuery): Observable<Page<Product>> {
    let params = new HttpParams().set('page', query.page).set('perPage', PER_PAGE).set('sort', query.sort);
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.categoryId) {
      params = params.set('category_id', query.categoryId);
    }
    return this.http.get<Page<Product>>(this.url(slug, '/products'), { params });
  }

  product(slug: string, id: number): Observable<Product> {
    return this.http.get<{ data: Product }>(this.url(slug, `/products/${id}`)).pipe(map((res) => res.data));
  }
}
