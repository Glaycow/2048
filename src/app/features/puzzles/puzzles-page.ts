import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PUZZLES } from '../../core/engine';
import { GameStore } from '../../core/store/game.store';

@Component({
  selector: 'app-puzzles-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './puzzles-page.html',
  styleUrl: './puzzles-page.scss',
})
export class PuzzlesPage {
  private readonly store = inject(GameStore);
  private readonly router = inject(Router);

  /** A level unlocks once the previous one is solved. */
  protected readonly levels = computed(() => {
    const progress = this.store.puzzleProgress();
    return PUZZLES.map((level, i) => ({
      level,
      best: progress[level.id] as number | undefined,
      locked: i > 0 && progress[PUZZLES[i - 1].id] === undefined,
    }));
  });

  protected play(levelId: string): void {
    this.store.start({ mode: 'puzzle', levelId });
    this.router.navigate(['/jogo']);
  }
}
