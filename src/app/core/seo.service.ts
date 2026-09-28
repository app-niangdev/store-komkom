import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SERVER_RESPONSE } from './tokens';

export interface SeoData {
  title: string;
  description: string;
  image?: string | null;
  themeColor?: string;
}

/** Titre, description et aperçu de partage (WhatsApp, Facebook) rendus côté serveur. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly response = inject(SERVER_RESPONSE, { optional: true });

  set(data: SeoData): void {
    const description = data.description.replace(/\s+/g, ' ').trim().slice(0, 180);
    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: this.document.location?.href ?? '' });
    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
    } else {
      this.meta.removeTag("property='og:image'");
    }
    if (data.themeColor) {
      this.meta.updateTag({ name: 'theme-color', content: data.themeColor });
    }
  }

  /** Page introuvable : vrai code 404 pour les moteurs de recherche (rendu serveur). */
  notFound(title: string): void {
    this.response?.status(404);
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
  }
}
