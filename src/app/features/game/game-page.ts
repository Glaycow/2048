import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Direction, PowerId } from '../../core/engine';
import { bestKey, GameStore } from '../../core/store/game.store';
import { BoardComponent } from './board/board';
import { LegendComponent } from './legend/legend';
import { LayoutPickerComponent } from './layout-picker/layout-picker';
import { PowerBarComponent } from './power-bar/power-bar';
import { ScoreComponent } from './score/score';

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  k: 'up',
  j: 'down',
  h: 'left',
  l: 'right',
};

const POWER_KEYS: Record<string, PowerId> = {
  u: 'undo',
  t: 'swap',
  x: 'remove',
  e: 'shuffle',
};

const POWER_DONE: Record<PowerId, string> = {
  undo: 'Movimento desfeito.',
  shuffle: 'Peças embaralhadas.',
  remove: 'Peça removida.',
  swap: 'Peças trocadas.',
};

const DIRECTION_LABEL: Record<Direction, string> = {
  up: 'cima',
  down: 'baixo',
  left: 'esquerda',
  right: 'direita',
};

@Component({
  selector: 'app-game-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoardComponent, ScoreComponent, LayoutPickerComponent, LegendComponent, PowerBarComponent],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class GamePage {
  protected readonly store = inject(GameStore);
  protected readonly pickerOpen = signal(false);
  protected readonly bestKey = bestKey;
  protected announcement = '';

  protected onKey(event: KeyboardEvent): void {
    if (this.pickerOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') {
      this.store.cancelTargeting();
      return;
    }
    if (key === 'r') {
      this.store.newGame();
      return;
    }
    if (POWER_KEYS[key]) {
      this.usePower(POWER_KEYS[key]);
      return;
    }
    const direction = KEY_MAP[event.key] ?? KEY_MAP[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    this.play(direction);
  }

  protected openPicker(picker: LayoutPickerComponent): void {
    this.pickerOpen.set(true);
    picker.open();
  }

  protected pickLayout(id: string): void {
    this.store.newGame(id);
    this.announcement = `Novo jogo: ${this.store.layout().name}.`;
  }

  protected usePower(power: PowerId): void {
    const before = this.store.powers()[power];
    this.store.usePower(power);
    if (this.store.powers()[power] < before) this.announcement = POWER_DONE[power];
    else if (this.store.targeting()) this.announcement = this.targetingHint();
  }

  protected pickTile(id: number): void {
    const power = this.store.targeting()?.power;
    const before = power ? this.store.powers()[power] : 0;
    this.store.pickTile(id);
    if (power && this.store.powers()[power] < before) this.announcement = POWER_DONE[power];
    else if (this.store.targeting()) this.announcement = this.targetingHint();
  }

  protected targetingHint(): string {
    const t = this.store.targeting();
    if (!t) return '';
    if (t.power === 'remove') return 'Escolha a peça para remover.';
    return t.first === undefined ? 'Escolha a primeira peça para trocar.' : 'Agora escolha a segunda peça.';
  }

  protected setSpecials(specials: boolean): void {
    this.store.setSpecials(specials);
    this.announcement = specials ? 'Peças especiais ativadas.' : 'Peças especiais desativadas.';
  }

  protected play(direction: Direction): void {
    this.store.move(direction);
    this.announcement = `Movido para ${DIRECTION_LABEL[direction]}. Pontuação ${this.store.score()}.`;
  }
}
