import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-exit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './exit.component.html',
  styleUrl: './exit.component.css',
})
export class ExitComponent {
  readonly message = input<string>('Há alterações não salvas. Se sair agora, elas serão perdidas.');
  readonly details = input<string>('');
}
