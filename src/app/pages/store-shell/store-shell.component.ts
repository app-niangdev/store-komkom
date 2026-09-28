import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { UiService } from '../../core/ui.service';
import { StoreData } from '../../core/resolvers';
import { StoreContextService } from '../../core/store-context.service';
import { CartService } from '../../core/cart.service';
import { formatMoney, formatPhone } from '../../core/format';
import { StoreLogoComponent } from '../../shared/store-logo/store-logo.component';
import { CartDrawerComponent } from '../../shared/cart-drawer/cart-drawer.component';
import { NotFoundComponent } from '../not-found/not-found.component';

/** Coque d'une vitrine : en-tête, pied de page, panier ; applique les couleurs de la boutique. */
@Component({
  selector: 'app-store-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, StoreLogoComponent, CartDrawerComponent, NotFoundComponent],
  templateUrl: './store-shell.component.html',
  styleUrl: './store-shell.component.scss',
  host: { '[style]': 'context.theme()' }
})
export class StoreShellComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly context = inject(StoreContextService);
  protected readonly cart = inject(CartService);
  protected readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly data = toSignal(this.route.data.pipe(map((d) => d['data'] as StoreData | null)), {
    initialValue: this.route.snapshot.data['data'] as StoreData | null
  });
  protected readonly store = computed(() => this.data()?.store ?? null);
  protected readonly formatPhone = formatPhone;
  protected readonly year = new Date().getFullYear();
  protected money = (value: number) => formatMoney(value, this.store()?.currency);

  /** Effet « rebond » du bouton panier après un ajout. */
  protected readonly bump = signal(false);
  protected readonly scrolled = signal(false);
  /** Navigation en cours (données chargées avant affichage) : barre de progression. */
  protected readonly navigating = signal(false);

  constructor() {
    // Icône d'onglet et d'écran d'accueil : le logo de la boutique
    effect(() => {
      const logo = this.store()?.logo_url;
      if (logo) {
        this.setIcon('icon', logo);
        this.setIcon('apple-touch-icon', logo);
      }
    });
    effect(
      () => {
        if (this.cart.lastAdded()) {
          this.bump.set(false);
          setTimeout(() => this.bump.set(true));
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      const data = d['data'] as StoreData | null;
      if (data) {
        this.cart.use(data.store.slug);
      }
    });
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => this.navigating.set(e instanceof NavigationStart));
    if (this.isBrowser) {
      const onScroll = () => this.scrolled.set(window.scrollY > 8);
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    }
  }

  openCartFromToast(): void {
    this.ui.dismiss();
    this.cart.isOpen.set(true);
  }

  private setIcon(rel: string, href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      this.document.head.appendChild(link);
    }
    link.removeAttribute('type');
    link.href = href;
  }

  get whatsappContact(): string | null {
    const store = this.store();
    return store?.whatsapp ? `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Bonjour ${store.name}, `)}` : null;
  }

  get mapsUrl(): string | null {
    const address = this.store()?.address;
    return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  }
}
