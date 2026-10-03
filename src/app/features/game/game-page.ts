import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [
    RouterLink,
    BoardComponent,
    ScoreComponent,
    LayoutPickerComponent,
    LegendComponent,
    PowerBarComponent,
  ],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class GamePage {
  protected readonly store = inject(GameStore);
  private readonly document = inject(DOCUMENT);
  protected readonly pickerOpen = signal(false);
  protected readonly copied = signal(false);
  protected announcement = '';

  /** Picker keys follow the current mode's records. */
  protected readonly pickerKey = (layoutId: string, specials: boolean) =>
    bestKey({ mode: this.store.mode(), layoutId, specials, date: undefined }) ?? '';

  protected readonly configurable = computed(() => {
    const mode = this.store.mode();
    return mode === 'classic' || mode === 'timed' || mode === 'zen';
  });

  protected readonly clock = computed(() => {
    const ms = this.store.timeLeft() ?? 0;
    const total = Math.ceil(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });

  protected readonly overTitle = computed(() => {
    switch (this.store.endReason()) {
      case 'time':
        return 'Tempo esgotado!';
      case 'moves':
        return 'Acabaram os movimentos';
      default:
        return 'Fim de jogo';
    }
  });

  protected readonly dailyLabel = computed(() => {
    const date = this.store.date();
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  });

  constructor() {
    // Timed mode clock; skips time while the tab is hidden.
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!this.document.hidden) this.store.tick(now - last);
      last = now;
    }, 200);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.pickerOpen() || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (event.key === 'Escape') {
      this.store.cancelTargeting();
      return;
    }
    if (key === 'r') {
      this.store.restart();
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
    this.store.start({ layoutId: id });
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

  protected async copyResult(): Promise<void> {
    const text = `2048 · Desafio diário ${this.dailyLabel()}\n${this.store.score()} pontos · maior peça ${this.store.maxTile()} · ${this.store.moves()} movimentos`;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.announcement = text;
    }
  }

  protected toggleSpecials(): void {
    const next = !this.store.specials();
    if (this.store.hasProgress() && !confirm('Isso inicia um novo jogo. Continuar?')) return;
    this.setSpecials(next);
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
