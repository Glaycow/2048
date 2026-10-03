import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Direction } from '../../core/engine';
import { GameStore } from '../../core/store/game.store';
import { BoardComponent } from './board/board';
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
  imports: [BoardComponent, ScoreComponent],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class GamePage {
  protected readonly store = inject(GameStore);
  protected announcement = '';

  protected onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'r' || event.key === 'R') {
      this.store.newGame();
      return;
    }
    const direction = KEY_MAP[event.key] ?? KEY_MAP[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    this.play(direction);
  }

  protected play(direction: Direction): void {
    this.store.move(direction);
    this.announcement = `Movido para ${DIRECTION_LABEL[direction]}. Pontuação ${this.store.score()}.`;
  }
}
