import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product, ProductUnit, Store } from './models';
import { formatMoney } from './format';

export interface CartItem {
  key: string;
  productId: number;
  name: string;
  image: string | null;
  unitId: number | null;
  unitName: string;
  /** Prix unitaire indicatif (null : à confirmer par la boutique). */
  price: number | null;
  quantity: number;
}

export interface OrderContact {
  name: string;
  note: string;
}

const STORAGE_PREFIX = 'vitrine.cart.';
const MAX_QUANTITY = 999;

/**
 * Panier d'une vitrine : propre à chaque boutique, gardé dans le navigateur (aucun compte
 * client). La commande part sur le WhatsApp de la boutique, qui confirme prix et stock.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private slug: string | null = null;

  readonly items = signal<CartItem[]>([]);
  readonly isOpen = signal(false);
  /** Dernier ajout, pour l'animation du bouton panier. */
  readonly lastAdded = signal<{ key: string; at: number } | null>(null);

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  readonly total = computed(() => this.items().reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0));
  readonly hasUnpriced = computed(() => this.items().some((i) => i.price === null));

  constructor() {
    effect(() => {
      const items = this.items();
      if (this.isBrowser && this.slug) {
        try {
          localStorage.setItem(STORAGE_PREFIX + this.slug, JSON.stringify(items));
        } catch {
          // Stockage indisponible (navigation privée) : le panier vit le temps de la visite
        }
      }
    });
  }

  /** Charge le panier de la boutique visitée. */
  use(slug: string): void {
    if (this.slug === slug) {
      return;
    }
    this.slug = slug;
    this.isOpen.set(false);
    let saved: CartItem[] = [];
    if (this.isBrowser) {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + slug) ?? '[]');
        saved = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.key === 'string' && i.quantity > 0) : [];
      } catch {
        saved = [];
      }
    }
    this.items.set(saved);
  }

  quantityOf(productId: number, unitId: number | null): number {
    return this.items().find((i) => i.key === this.key(productId, unitId))?.quantity ?? 0;
  }

  add(product: Product, unit: ProductUnit | null, quantity = 1): void {
    const key = this.key(product.id, unit?.id ?? null);
    const existing = this.items().find((i) => i.key === key);
    if (existing) {
      this.setQuantity(key, existing.quantity + quantity);
    } else {
      this.items.update((items) => [
        ...items,
        {
          key,
          productId: product.id,
          name: product.name,
          image: product.image_url,
          unitId: unit?.id ?? null,
          unitName: unit?.name ?? product.unit,
          price: unit ? unit.price || null : product.price || null,
          quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity))
        }
      ]);
    }
    this.lastAdded.set({ key, at: Date.now() });
  }

  setQuantity(key: string, quantity: number): void {
    const qty = Math.min(MAX_QUANTITY, Math.floor(quantity));
    this.items.update((items) =>
      qty <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, quantity: qty } : i))
    );
  }

  remove(key: string): void {
    this.items.update((items) => items.filter((i) => i.key !== key));
  }

  clear(): void {
    this.items.set([]);
  }

  /** Lien wa.me avec la commande rédigée ; `items` : commande directe d'un seul produit. */
  whatsappLink(store: Store, contact: OrderContact, pageUrl: string, items: CartItem[] = this.items()): string | null {
    if (!store.whatsapp || items.length === 0) {
      return null;
    }
    const currency = store.currency;
    const lines = items.map((i) => {
      const price = i.price !== null ? ` — ${formatMoney(i.price * i.quantity, currency)}` : ' — prix à confirmer';
      return `• ${i.quantity} × ${i.name} (${i.unitName})${price}`;
    });
    const total = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
    const unpriced = items.some((i) => i.price === null);

    const message = [
      `Bonjour ${store.name} 👋`,
      'Je souhaite commander :',
      '',
      ...lines,
      '',
      `*Total indicatif : ${formatMoney(total, currency)}*${unpriced ? ' (hors articles à prix à confirmer)' : ''}`,
      contact.name.trim() ? `\nNom : ${contact.name.trim()}` : '',
      contact.note.trim() ? `Note : ${contact.note.trim()}` : '',
      '',
      `Commande préparée depuis votre vitrine : ${pageUrl}`
    ]
      .filter((line, index, all) => line !== '' || all[index - 1] !== '')
      .join('\n');

    return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  private key(productId: number, unitId: number | null): string {
    return `${productId}:${unitId ?? 'base'}`;
  }
}
