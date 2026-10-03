import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tile } from '../../../core/engine';

@Component({
  selector: 'app-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tile.html',
  styleUrl: './tile.scss',
  host: {
    '[style.--row]': 'tile().row',
    '[style.--col]': 'tile().col',
    '[attr.data-kind]': 'kind()',
    '[attr.data-value]': 'tier()',
    '[attr.data-digits]': 'digits()',
    '[attr.aria-label]': 'label()',
    '[class.new]': 'tile().isNew',
    '[class.merged]': 'tile().merged',
    '[class.frozen]': '!!tile().frozen',
    '[class.ghost]': 'ghost()',
    '[class.exploding]': 'tile().exploding',
  },
})
export class TileComponent {
  readonly tile = input.required<Tile>();
  readonly ghost = input(false);

  protected readonly kind = computed(() => this.tile().kind ?? 'number');
  protected readonly tier = computed(() => Math.min(this.tile().value, 4096));
  protected readonly digits = computed(() => Math.min(String(this.tile().value).length, 5));
  protected readonly label = computed(() => {
    const t = this.tile();
    switch (this.kind()) {
      case 'bomb':
        return `Bomba, explode em ${t.fuse}`;
      case 'multiplier':
        return 'Multiplicador ×2';
      case 'stone':
        return 'Pedra';
      default:
        return t.frozen ? `${t.value}, congelada por ${t.frozen}` : String(t.value);
    }
  });
}
