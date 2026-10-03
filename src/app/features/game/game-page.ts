import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Direction } from '../../core/engine';
import { bestKey, GameStore } from '../../core/store/game.store';
import { BoardComponent } from './board/board';
import { LegendComponent } from './legend/legend';
import { LayoutPickerComponent } from './layout-picker/layout-picker';
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

const DIRECTION_LABEL: Record<Direction, string> = {
  up: 'cima',
  down: 'baixo',
  left: 'esquerda',
  right: 'direita',
};

@Component({
  selector: 'app-game-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoardComponent, ScoreComponent, LayoutPickerComponent, LegendComponent],
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
    if (event.key === 'r' || event.key === 'R') {
      this.store.newGame();
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

  protected setSpecials(specials: boolean): void {
    this.store.setSpecials(specials);
    this.announcement = specials ? 'Peças especiais ativadas.' : 'Peças especiais desativadas.';
  }

  protected play(direction: Direction): void {
    this.store.move(direction);
    this.announcement = `Movido para ${DIRECTION_LABEL[direction]}. Pontuação ${this.store.score()}.`;
  }
}
