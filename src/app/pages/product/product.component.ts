import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { StorefrontApiService } from '../../core/storefront-api.service';
import { UiService } from '../../core/ui.service';
import { productIcon } from '../../core/category-icon';
import { ProductCardComponent } from '../../shared/product-card/product-card.component';
import { Product, ProductUnit } from '../../core/models';
import { CartItem, CartService } from '../../core/cart.service';
import { StoreContextService } from '../../core/store-context.service';
import { SeoService } from '../../core/seo.service';
import { formatMoney } from '../../core/format';
import { NotFoundComponent } from '../not-found/not-found.component';

/** Fiche produit : unité de vente, quantité, ajout au panier ou commande directe. */
@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, NotFoundComponent, ProductCardComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly context = inject(StoreContextService);
  protected readonly cart = inject(CartService);
  private readonly api = inject(StorefrontApiService);
  private readonly ui = inject(UiService);

  protected readonly product = toSignal(this.route.data.pipe(map((d) => d['product'] as Product | null)), {
    initialValue: this.route.snapshot.data['product'] as Product | null
  });
  protected readonly store = computed(() => this.context.store()!);

  protected readonly unitId = signal<number | null>(null);
  protected readonly quantity = signal(1);

  protected readonly unit = computed<ProductUnit | null>(() => {
    const units = this.product()?.units ?? [];
    return units.find((u) => u.id === this.unitId()) ?? units.find((u) => u.is_base) ?? units[0] ?? null;
  });
  protected readonly price = computed(() => (this.unit() ? this.unit()!.price || null : this.product()?.price || null));
  protected readonly inCart = computed(() => {
    const p = this.product();
    return p ? this.cart.quantityOf(p.id, this.unit()?.id ?? null) : 0;
  });
  protected readonly icon = computed(() => productIcon(this.product()?.name ?? '', this.product()?.category?.name ?? null));

  /** « Vous aimerez aussi » : même catégorie, sinon les nouveautés (rendu aussi côté serveur). */
  protected readonly related = toSignal(
    this.route.data.pipe(
      map((d) => d['product'] as Product | null),
      switchMap((product) => {
        const slug = this.context.store()?.slug;
        if (!product || !slug) {
          return of<Product[]>([]);
        }
        return this.api
          .products(slug, { page: 1, search: '', categoryId: product.category?.id ?? null, sort: product.category ? 'name' : 'recent' })
          .pipe(
            map((page) => page.data.filter((p) => p.id !== product.id).slice(0, 4)),
            catchError(() => of<Product[]>([]))
          );
      })
    ),
    { initialValue: [] as Product[] }
  );

  constructor() {
    this.ui.hideCartBar.set(true);
    inject(DestroyRef).onDestroy(() => this.ui.hideCartBar.set(false));
    // Nouvelle fiche (navigation d'un produit à l'autre) : on repart de l'unité de base
    effect(() => {
      this.product();
      this.unitId.set(null);
      this.quantity.set(1);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateSeo());
  }

  money(value: number): string {
    return formatMoney(value, this.store().currency);
  }

  changeQuantity(delta: number): void {
    this.quantity.update((q) => Math.min(999, Math.max(1, q + delta)));
  }

  addToCart(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    const quantity = this.quantity();
    this.cart.add(product, this.unit(), quantity);
    this.ui.notify(`${quantity > 1 ? quantity + ' × ' : ''}${product.name} ajouté au panier`, product.image_url);
    this.quantity.set(1);
  }

  /** Commande immédiate de ce seul produit, sans toucher au panier. */
  get directOrderLink(): string | null {
    const product = this.product();
    if (!product) {
      return null;
    }
    const unit = this.unit();
    const item: CartItem = {
      key: 'direct',
      productId: product.id,
      name: product.name,
      image: product.image_url,
      unitId: unit?.id ?? null,
      unitName: unit?.name ?? product.unit,
      price: this.price(),
      quantity: this.quantity()
    };
    return this.cart.whatsappLink(this.store(), { name: '', note: '' }, this.document.location?.href ?? '', [item]);
  }

  private updateSeo(): void {
    const product = this.product();
    const store = this.store();
    if (!product) {
      this.seo.notFound(`Produit indisponible — ${store.name}`);
      return;
    }
    const price = product.price ? ` à ${formatMoney(product.price, store.currency)}` : '';
    this.seo.set({
      title: `${product.name} — ${store.name}`,
      description: `${product.name}${price}, disponible chez ${store.name}. ${product.description ?? ''} Commandez sur WhatsApp.`,
      image: product.image_url ?? store.logo_url,
      themeColor: this.context.theme()['--brand']
    });
  }
}
