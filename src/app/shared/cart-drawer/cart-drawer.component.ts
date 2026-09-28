import { Component, ElementRef, PLATFORM_ID, effect, inject, input, signal, viewChild } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { Store } from '../../core/models';
import { formatMoney, initials } from '../../core/format';

const CONTACT_KEY = 'vitrine.contact';

/** Panier : quantités, coordonnées facultatives, puis envoi de la commande sur WhatsApp. */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
  host: { '(document:keydown.escape)': 'close()' }
})
export class CartDrawerComponent {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly cart = inject(CartService);

  readonly store = input.required<Store>();
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly initials = initials;
  protected name = '';
  protected note = '';
  protected readonly sent = signal(false);

  constructor() {
    if (this.isBrowser) {
      try {
        const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? '{}');
        this.name = typeof saved.name === 'string' ? saved.name : '';
      } catch {
        // pas de coordonnées mémorisées
      }
    }
    // Ouverture : on bloque le défilement de la page et on place le focus dans le panneau
    effect(() => {
      const open = this.cart.isOpen();
      if (!this.isBrowser) {
        return;
      }
      this.document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        this.sent.set(false);
        setTimeout(() => this.panel()?.nativeElement.focus());
      }
    }, { allowSignalWrites: true });
  }

  money(value: number): string {
    return formatMoney(value, this.store().currency);
  }

  close(): void {
    this.cart.isOpen.set(false);
  }

  get orderLink(): string | null {
    return this.cart.whatsappLink(this.store(), { name: this.name, note: this.note }, this.pageUrl());
  }

  onOrder(): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: this.name.trim() }));
      } catch {
        // stockage indisponible
      }
    }
    this.sent.set(true);
  }

  /** Après envoi : le client vide son panier une fois la conversation ouverte. */
  clearAfterOrder(): void {
    this.cart.clear();
    this.note = '';
    this.close();
  }

  private pageUrl(): string {
    const origin = this.document.location?.origin ?? '';
    return `${origin}/${this.store().slug}`;
  }
}
