import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateBannerComponent } from './core/pwa/update-banner';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UpdateBannerComponent],
  template: `<router-outlet /><app-update-banner />`,
})
export class App {}
