import { Injectable, computed, signal } from '@angular/core';
import { Category, Store } from './models';
import { BrandTheme, buildTheme } from './theme';

/** Boutique visitée : identité, catégories et palette, partagées par toutes les pages. */
@Injectable({ providedIn: 'root' })
export class StoreContextService {
  readonly store = signal<Store | null>(null);
  readonly categories = signal<Category[]>([]);

  readonly theme = computed<BrandTheme>(() => {
    const store = this.store();
    return buildTheme(store?.primary_color ?? null, store?.secondary_color ?? null);
  });

  set(store: Store, categories: Category[]): void {
    this.store.set(store);
    this.categories.set(categories);
  }
}
