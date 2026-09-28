import { Component, computed, input } from '@angular/core';
import { initials } from '../../core/format';

/** Logo de la boutique, ou ses initiales sur sa couleur quand il n'y en a pas. */
@Component({
  selector: 'app-store-logo',
  standalone: true,
  template: `
    @if (url()) {
      <img [src]="url()" [alt]="'Logo ' + name()" loading="eager" decoding="async" />
    } @else {
      <span aria-hidden="true">{{ letters() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--logo-size, 44px);
      height: var(--logo-size, 44px);
      flex-shrink: 0;
      overflow: hidden;
      border-radius: var(--logo-radius, 12px);
      background: #fff;
      box-shadow: inset 0 0 0 1px var(--line);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 4px;
    }
    span {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: var(--brand);
      color: var(--brand-ink);
      font-weight: 800;
      font-size: calc(var(--logo-size, 44px) * 0.38);
      letter-spacing: 0.02em;
    }
  `
})
export class StoreLogoComponent {
  readonly url = input<string | null>(null);
  readonly name = input.required<string>();
  protected readonly letters = computed(() => initials(this.name()));
}
