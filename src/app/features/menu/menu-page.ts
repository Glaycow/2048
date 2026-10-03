import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModeId, MODES, PUZZLES, todayKey } from '../../core/engine';
import { GameStore } from '../../core/store/game.store';

@Component({
  selector: 'app-menu-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-page.html',
  styleUrl: './menu-page.scss',
})
export class MenuPage {
  protected readonly store = inject(GameStore);
  private readonly router = inject(Router);

  protected readonly modes = MODES;
  protected readonly solved = computed(() => Object.keys(this.store.puzzleProgress()).length);
  protected readonly dailyBest = computed(() => this.store.bestScores()[`diario:${todayKey()}`] ?? 0);

  protected readonly details = computed<Record<ModeId, string>>(() => ({
    classic: 'Tabuleiros de 3×3 a 8×8 e formatos especiais',
    timed: 'Recorde e tabuleiro à sua escolha',
    daily: this.dailyBest() ? `Seu melhor hoje: ${this.dailyBest()}` : 'Ainda não jogado hoje',
    puzzle: `${this.solved()} de ${PUZZLES.length} resolvidos`,
    zen: 'Ideal para relaxar',
  }));

  protected continueGame(): void {
    this.router.navigate(['/jogo']);
  }

  protected choose(mode: ModeId): void {
    if (mode === 'puzzle') {
      this.router.navigate(['/puzzles']);
      return;
    }
    const sameDaily = mode === 'daily' && this.store.mode() === 'daily' && this.store.date() === todayKey();
    if (!sameDaily) this.store.start({ mode });
    this.router.navigate(['/jogo']);
  }
}
