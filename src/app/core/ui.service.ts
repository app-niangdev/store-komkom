import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  image: string | null;
}

/** Retours visuels globaux : confirmation d'ajout au panier. */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly toast = signal<Toast | null>(null);
  /** Page ayant sa propre zone d'achat en bas d'écran (fiche produit) : pas de barre panier. */
  readonly hideCartBar = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  notify(text: string, image: string | null = null): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    const toast = { id: Date.now(), text, image };
    this.toast.set(toast);
    this.timer = setTimeout(() => this.toast() === toast && this.toast.set(null), 2800);
  }

  dismiss(): void {
    this.toast.set(null);
  }
}
