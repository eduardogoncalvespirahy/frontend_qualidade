import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './confirm.component.html',
  styleUrl: './confirm.component.css',
})
export class ConfirmComponent {
  readonly message = input<string>('Tem certeza?');
  readonly details = input<string>('');
}
