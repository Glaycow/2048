import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { POWER_IDS, POWER_MAX, PowerId, Powers, RECHARGE_EVERY } from '../../../core/engine';

const INFO: Record<PowerId, { name: string; key: string; hint: string }> = {
  undo: { name: 'Desfazer', key: 'U', hint: 'Volta o último movimento' },
  swap: { name: 'Trocar', key: 'T', hint: 'Troca duas peças de lugar' },
  remove: { name: 'Remover', key: 'X', hint: 'Remove uma peça' },
  shuffle: { name: 'Embaralhar', key: 'E', hint: 'Reorganiza as peças' },
};

@Component({
  selector: 'app-power-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './power-bar.html',
  styleUrl: './power-bar.scss',
})
export class PowerBarComponent {
  readonly powers = input.required<Powers>();
  readonly available = input.required<Readonly<Record<PowerId, boolean>>>();
  readonly active = input<PowerId | null>(null);
  readonly moves = input(0);
  readonly use = output<PowerId>();

  protected readonly ids = POWER_IDS;
  protected readonly info = INFO;
  protected readonly slots = Array.from({ length: POWER_MAX }, (_, i) => i);
  protected readonly nextRecharge = computed(() => RECHARGE_EVERY - (this.moves() % RECHARGE_EVERY));
}
