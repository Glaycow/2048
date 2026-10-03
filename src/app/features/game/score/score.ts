import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="label">{{ label() }}</span>
    <span class="value">{{ value() }}</span>
    @if (gain(); as gain) {
      @for (g of [gain]; track g.key) {
        <span class="gain" aria-hidden="true">+{{ g.value }}</span>
      }
    }
  `,
  styles: `
    :host {
      position: relative;
      display: grid;
      min-width: 5.5rem;
      padding: 0.4rem 0.9rem;
      border-radius: 0.5rem;
      background: var(--board);
      text-align: center;
    }
    .label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .value {
      font-size: 1.4rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: var(--fg-light);
    }
    .gain {
      position: absolute;
      inset: auto 0 0.4rem;
      font-weight: 800;
      color: var(--accent);
      animation: float 700ms ease-out forwards;
      pointer-events: none;
    }
    @keyframes float {
      to {
        opacity: 0;
        transform: translateY(-2.5rem);
      }
    }
  `,
})
export class ScoreComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly gain = input<{ value: number; key: number } | null>(null);
}
