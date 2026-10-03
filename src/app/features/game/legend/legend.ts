import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BOMB_FUSE, ICE_TURNS, SPECIALS_FROM_MOVE, Tile } from '../../../core/engine';
import { TileComponent } from '../tile/tile';

interface Entry {
  readonly tile: Tile;
  readonly name: string;
  readonly text: string;
}

@Component({
  selector: 'app-legend',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TileComponent],
  template: `
    <h2 class="sr-only">Peças especiais</h2>
    @if (moves() < startsAt) {
      <p class="soon">As peças especiais começam a aparecer a partir do {{ startsAt }}º movimento.</p>
    }
    <ul>
      @for (entry of entries; track entry.name) {
        <li>
          <span class="sample"><app-tile [tile]="entry.tile" /></span>
          <span><strong>{{ entry.name }}</strong> {{ entry.text }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.6rem 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.85rem;
      color: var(--muted-fg);
    }
    strong {
      color: var(--fg);
    }
    .soon {
      margin: 0 0 0.6rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--accent);
    }
    .sample {
      --cell: 2.4rem;
      --gap: 0.5rem;
      --slide: 0ms;
      position: relative;
      flex: none;
      width: var(--cell);
      height: var(--cell);
    }
  `,
})
export class LegendComponent {
  readonly moves = input(999);
  protected readonly startsAt = SPECIALS_FROM_MOVE;

  protected readonly entries: readonly Entry[] = [
    {
      tile: { id: -1, value: 0, row: 0, col: 0, kind: 'bomb', fuse: BOMB_FUSE },
      name: 'Bomba',
      text: `explode após ${BOMB_FUSE} movimentos e limpa as peças ao redor.`,
    },
    {
      tile: { id: -2, value: 8, row: 0, col: 0, frozen: ICE_TURNS },
      name: 'Gelo',
      text: `a peça fica parada e não se junta por ${ICE_TURNS} movimentos.`,
    },
    {
      tile: { id: -3, value: 0, row: 0, col: 0, kind: 'multiplier' },
      name: 'Multiplicador',
      text: 'dobra o valor da peça que encostar nele.',
    },
    {
      tile: { id: -4, value: 0, row: 0, col: 0, kind: 'stone' },
      name: 'Pedra',
      text: 'bloqueia o caminho; quebra com uma junção ao lado.',
    },
  ];
}
