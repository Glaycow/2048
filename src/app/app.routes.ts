import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/game/game-page').then((m) => m.GamePage) },
  { path: '**', redirectTo: '' },
];
