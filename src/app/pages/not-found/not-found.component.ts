import { Component, OnInit, computed, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo.service';
import { StoreContextService } from '../../core/store-context.service';

type Kind = 'store' | 'product' | 'page' | 'no-store';

const CONTENT: Record<Kind, { icon: string; title: string; text: string }> = {
  store: {
    icon: 'bi-shop',
    title: 'Cette vitrine n\'est pas disponible',
    text: 'Le lien est peut-être incorrect, ou la boutique a mis sa vitrine en pause. Contactez-la directement pour passer commande.'
  },
  product: {
    icon: 'bi-box-seam',
    title: 'Ce produit n\'est plus disponible',
    text: 'Il vient peut-être d\'être vendu. Découvrez les autres produits de la boutique.'
  },
  page: {
    icon: 'bi-signpost-split',
    title: 'Page introuvable',
    text: 'Cette page n\'existe pas. Retrouvez tous les produits sur l\'accueil de la boutique.'
  },
  'no-store': {
    icon: 'bi-link-45deg',
    title: 'Lien de vitrine incomplet',
    text: 'Ouvrez le lien complet envoyé par la boutique : il se termine par le nom de la boutique.'
  }
};

/** Page d'erreur : boutique ou produit indisponible, lien incomplet (code 404 côté serveur). */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="nf" [class.nf--full]="!store()">
      <span class="nf__icon"><i class="bi {{ content().icon }}"></i></span>
      <h1>{{ content().title }}</h1>
      <p>{{ content().text }}</p>
      @if (store(); as s) {
        <a class="btn btn--brand" [routerLink]="['/', s.slug]"><i class="bi bi-grid"></i> Voir les produits</a>
      }
    </section>
  `,
  styles: `
    .nf {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      max-width: 520px;
      margin: 0 auto;
      padding: clamp(3rem, 10vw, 6rem) var(--gutter);
      text-align: center;
    }
    .nf--full {
      min-height: 100vh;
      justify-content: center;
    }
    .nf__icon {
      display: grid;
      place-items: center;
      width: 84px;
      height: 84px;
      margin-bottom: 0.5rem;
      border-radius: 28px;
      background: var(--brand-soft);
      color: var(--brand-strong);
      font-size: 2.1rem;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.4rem, 4vw, 1.9rem);
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 0.75rem;
      color: var(--muted);
    }
  `
})
export class NotFoundComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly context = inject(StoreContextService);

  /** Sinon lu dans les données de la route. */
  readonly kind = input<Kind | null>(null);

  protected readonly resolvedKind = computed<Kind>(() => this.kind() ?? (this.route.snapshot.data['kind'] as Kind) ?? 'page');
  protected readonly content = computed(() => CONTENT[this.resolvedKind()]);
  /** Lien de retour seulement dans une boutique existante. */
  protected readonly store = computed(() => (['product', 'page'].includes(this.resolvedKind()) ? this.context.store() : null));

  ngOnInit(): void {
    this.seo.notFound(this.content().title);
  }
}
