import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-exit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './exit.component.html',
  styleUrl: './exit.component.css',
})
export class ExitComponent {
  readonly message = input<string>('');
  readonly details = input<string>('');

  readonly hasDetails = computed(() => !!this.details()?.trim());
}
