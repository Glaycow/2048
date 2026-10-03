import { Directive, input, output } from '@angular/core';
import { Direction } from '../../../core/engine';

@Directive({
  selector: '[appSwipe]',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'origin = null',
    style: 'touch-action: none',
  },
})
export class SwipeDirective {
  readonly threshold = input(24);
  readonly appSwipe = output<Direction>();

  protected origin: { x: number; y: number } | null = null;

  protected start(event: PointerEvent): void {
    this.origin = { x: event.clientX, y: event.clientY };
  }

  protected end(event: PointerEvent): void {
    if (!this.origin) return;
    const dx = event.clientX - this.origin.x;
    const dy = event.clientY - this.origin.y;
    this.origin = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.threshold()) return;
    if (Math.abs(dx) > Math.abs(dy)) this.appSwipe.emit(dx > 0 ? 'right' : 'left');
    else this.appSwipe.emit(dy > 0 ? 'down' : 'up');
  }
}
