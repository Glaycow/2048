import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Direction, Tile } from '../../../core/engine';
import { SLIDE_MS } from '../../../core/store/game.store';
import { SwipeDirective } from '../swipe/swipe.directive';
import { TileComponent } from '../tile/tile';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TileComponent, SwipeDirective],
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: {
    '[style.--size]': 'size()',
    '[style.--slide]': 'slide',
  },
})
export class BoardComponent {
  readonly size = input.required<number>();
  readonly tiles = input.required<readonly Tile[]>();
  readonly blocked = input<ReadonlySet<number>>(new Set());
  readonly ghostIds = input<ReadonlySet<number>>(new Set());
  readonly swipe = output<Direction>();

  protected readonly slide = `${SLIDE_MS}ms`;
  protected readonly cells = computed(() => Array.from({ length: this.size() ** 2 }, (_, i) => i));
}
