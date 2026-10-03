import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { BoardLayout } from '../../../core/engine';

@Component({
  selector: 'app-layout-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-picker.html',
  styleUrl: './layout-picker.scss',
})
export class LayoutPickerComponent {
  readonly layouts = input.required<readonly BoardLayout[]>();
  readonly current = input.required<string>();
  readonly best = input<Readonly<Record<string, number>>>({});
  readonly pick = output<string>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  protected choose(id: string): void {
    this.dialog().nativeElement.close();
    this.pick.emit(id);
  }

  protected cells(layout: BoardLayout): boolean[] {
    return Array.from({ length: layout.size ** 2 }, (_, i) => layout.blocked.includes(i));
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.dialog().nativeElement.close();
  }
}
