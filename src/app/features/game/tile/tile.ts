import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tile } from '../../../core/engine';

@Component({
  selector: 'app-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="face">{{ tile().value }}</div>`,
  styleUrl: './tile.scss',
  host: {
    '[style.--row]': 'tile().row',
    '[style.--col]': 'tile().col',
    '[attr.data-value]': 'tier()',
    '[attr.data-digits]': 'digits()',
    '[class.new]': 'tile().isNew',
    '[class.merged]': 'tile().merged',
    '[class.ghost]': 'ghost()',
  },
})
export class TileComponent {
  readonly tile = input.required<Tile>();
  readonly ghost = input(false);

  protected readonly tier = computed(() => Math.min(this.tile().value, 4096));
  protected readonly digits = computed(() => Math.min(String(this.tile().value).length, 5));
}
