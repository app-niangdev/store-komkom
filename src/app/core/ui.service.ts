import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface Toast {
  id: number;
  text: string;
  image: string | null;
  /** Confirmation d'ajout au panier, avec bouton « Voir » (sinon simple information). */
  action: boolean;
}

/** Retours visuels globaux et état de la coque partagé par les pages. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly toast = signal<Toast | null>(null);
  /** Page ayant sa propre zone d'achat en bas d'écran (fiche produit) : pas de dock mobile. */
  readonly hideCartBar = signal(false);
  /** Page ouvrant sur la couverture de la boutique : l'en-tête se pose dessus, transparent. */
  readonly overCover = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  notify(text: string, image: string | null = null, action = true): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const toast = { id: Date.now(), text, image, action };
    this.toast.set(toast);
    this.timer = setTimeout(() => this.toast() === toast && this.toast.set(null), 2800);
  }

  dismiss(): void {
    this.toast.set(null);
  }

  /** Partage natif du téléphone (WhatsApp, SMS…), sinon copie du lien. */
  async share(title: string, url: string = this.document.location?.href ?? ''): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const nav = this.document.defaultView?.navigator;
    if (nav?.share) {
      try {
        await nav.share({ title, url });
      } catch {
        // partage annulé par le visiteur
      }
      return;
    }
    try {
      await nav?.clipboard.writeText(url);
      this.notify('Lien copié, prêt à être partagé', null, false);
    } catch {
      this.notify(url, null, false);
    }
  }

  /** Petite vibration de confirmation (Android), sans effet ailleurs. */
  tap(): void {
    if (this.isBrowser) {
      try {
        this.document.defaultView?.navigator.vibrate?.(12);
      } catch {
        // non pris en charge
      }
    }
  }
}
