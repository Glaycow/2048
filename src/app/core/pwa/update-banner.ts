import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Offers a reload when the service worker has downloaded a new version. */
@Component({
  selector: 'app-update-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ready()) {
      <div class="banner" role="status">
        <span>Nova versão disponível.</span>
        <button type="button" class="btn" (click)="reload()">Atualizar</button>
        <button type="button" class="close" aria-label="Dispensar" (click)="ready.set(false)">✕</button>
      </div>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      inset: auto 1rem 1rem;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      max-width: 460px;
      margin: 0 auto;
      padding: 0.6rem 0.6rem 0.6rem 1rem;
      border-radius: 0.85rem;
      background: var(--fg);
      color: var(--bg);
      font-weight: 700;
      box-shadow: 0 0.75rem 2rem rgb(0 0 0 / 30%);
      animation: rise 250ms ease-out;
    }
    span {
      flex: 1;
    }
    .close {
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 1rem;
      cursor: pointer;
    }
    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
    }
  `,
})
export class UpdateBannerComponent {
  private readonly updates = inject(SwUpdate);
  protected readonly ready = signal(false);

  constructor() {
    if (!this.updates.isEnabled) return;
    const sub = this.updates.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.ready.set(true));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  protected reload(): void {
    this.updates.activateUpdate().then(() => location.reload());
  }
}
