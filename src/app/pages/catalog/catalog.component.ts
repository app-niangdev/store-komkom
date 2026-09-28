import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { Page, Product, ProductQuery, ProductSort } from '../../core/models';
import { readQuery } from '../../core/resolvers';
import { StoreContextService } from '../../core/store-context.service';
import { SeoService } from '../../core/seo.service';
import { formatPhone } from '../../core/format';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { StoreLogoComponent } from '../../shared/store-logo/store-logo.component';

type PageItem = number | 'gap';

/** Accueil d'une vitrine : présentation de la boutique puis catalogue filtrable et paginé. */
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [RouterLink, FormsModule, ProductCardComponent, StoreLogoComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  protected readonly context = inject(StoreContextService);

  protected readonly result = toSignal(this.route.data.pipe(map((d) => d['page'] as Page<Product> | null)), {
    initialValue: this.route.snapshot.data['page'] as Page<Product> | null
  });
  protected readonly query = toSignal(this.route.queryParamMap.pipe(map(() => readQuery(this.route.snapshot))), {
    initialValue: readQuery(this.route.snapshot)
  });

  protected readonly store = computed(() => this.context.store()!);
  protected readonly formatPhone = formatPhone;
  protected readonly sorts: { value: ProductSort; label: string }[] = [
    { value: 'name', label: 'Nom (A → Z)' },
    { value: 'price_asc', label: 'Prix croissant' },
    { value: 'price_desc', label: 'Prix décroissant' },
    { value: 'recent', label: 'Nouveautés' }
  ];

  protected search = '';
  private readonly search$ = new Subject<string>();

  protected readonly activeCategory = computed(() => {
    const id = this.query().categoryId;
    return id ? this.context.categories().find((c) => c.id === id) ?? null : null;
  });

  protected readonly hasFilters = computed(() => !!this.query().search || !!this.query().categoryId);

  protected readonly firstIndex = computed(() => {
    const meta = this.result()?.meta;
    return meta && meta.total ? (meta.current_page - 1) * meta.per_page + 1 : 0;
  });
  protected readonly lastIndex = computed(() => {
    const meta = this.result()?.meta;
    return meta ? Math.min(meta.total, meta.current_page * meta.per_page) : 0;
  });

  /** 1 … 4 5 [6] 7 8 … 20 */
  protected readonly pages = computed<PageItem[]>(() => {
    const meta = this.result()?.meta;
    if (!meta || meta.last_page <= 1) {
      return [];
    }
    const { current_page: current, last_page: last } = meta;
    const wanted = new Set([1, last, current - 1, current, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((p) => wanted.add(p));
    if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((p) => wanted.add(p));
    const sorted = [...wanted].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (['gap', p] as PageItem[]) : [p]));
  });

  get whatsappContact(): string | null {
    const s = this.store();
    return s.whatsapp ? `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Bonjour ${s.name}, `)}` : null;
  }

  ngOnInit(): void {
    this.search = this.query().search;
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.navigate({ q: term || null, page: null }));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateSeo());
  }

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  submitSearch(): void {
    this.navigate({ q: this.search.trim() || null, page: null });
  }

  clearSearch(): void {
    this.search = '';
    this.search$.next('');
  }

  setSort(sort: ProductSort): void {
    this.navigate({ tri: sort === 'name' ? null : sort, page: null });
  }

  resetFilters(): void {
    this.search = '';
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, fragment: 'catalogue' });
  }

  /** Paramètres d'URL d'une page de résultats (lien réel : partageable et indexable). */
  pageParams(page: number): Record<string, string | number | null> {
    return { page: page === 1 ? null : page };
  }

  categoryParams(id: number | null): Record<string, string | number | null> {
    return { cat: id, page: null };
  }

  reload(): void {
    this.document.location.reload();
  }

  private navigate(params: Record<string, string | number | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', fragment: 'catalogue' });
  }

  private updateSeo(): void {
    const store = this.store();
    const q: ProductQuery = this.query();
    const category = this.activeCategory();
    const parts = [category?.name, q.search ? `« ${q.search} »` : null, q.page > 1 ? `page ${q.page}` : null].filter(Boolean);
    this.seo.set({
      title: parts.length ? `${parts.join(' · ')} — ${store.name}` : `${store.name} — Produits disponibles`,
      description:
        `${store.slogan ? store.slogan + '. ' : ''}${store.products_count} produit(s) disponible(s) chez ${store.name}` +
        `${store.address ? ' (' + store.address + ')' : ''}. Commandez directement sur WhatsApp.`,
      image: store.logo_url,
      themeColor: this.context.theme()['--brand']
    });
  }
}
