import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { UiService } from '../../core/ui.service';
import { Product, ProductUnit } from '../../core/models';
import { formatMoney } from '../../core/format';
import { productIcon } from '../../core/category-icon';

/** Carte du catalogue : visuel, prix et ajout rapide au panier (unité de base). */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  protected readonly cart = inject(CartService);
  private readonly ui = inject(UiService);

  readonly product = input.required<Product>();
  readonly slug = input.required<string>();
  readonly currency = input('XOF');
  /** Les premières cartes sont visibles tout de suite : image chargée en priorité. */
  readonly eager = input(false);

  protected readonly icon = computed(() => productIcon(this.product().name, this.product().category?.name ?? null));
  /** Teinte de fond (4 variantes) : une grille sans photos reste vivante. */
  protected readonly tint = computed(() => `var(--tint-${this.product().id % 4})`);
  protected readonly baseUnit = computed<ProductUnit | null>(
    () => this.product().units.find((u) => u.is_base) ?? this.product().units[0] ?? null
  );
  protected readonly inCart = computed(() => this.cart.quantityOf(this.product().id, this.baseUnit()?.id ?? null));
  protected readonly link = computed(() => ['/', this.slug(), 'produit', this.product().id]);

  money(value: number): string {
    return formatMoney(value, this.currency());
  }

  add(): void {
    this.cart.add(this.product(), this.baseUnit());
    this.ui.notify(`${this.product().name} ajouté au panier`, this.product().image_url);
  }

  change(delta: number): void {
    const key = `${this.product().id}:${this.baseUnit()?.id ?? 'base'}`;
    this.cart.setQuantity(key, this.inCart() + delta);
  }
}
