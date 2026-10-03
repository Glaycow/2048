import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: '2048',
    loadComponent: () => import('./features/menu/menu-page').then((m) => m.MenuPage),
  },
  {
    path: 'jogo',
    title: '2048 · Jogo',
    loadComponent: () => import('./features/game/game-page').then((m) => m.GamePage),
  },
  {
    path: 'puzzles',
    title: '2048 · Puzzles',
    loadComponent: () => import('./features/puzzles/puzzles-page').then((m) => m.PuzzlesPage),
  },
  { path: '**', redirectTo: '' },
];
