import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<AlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  danger: '✕',
};

@Component({
  selector: 'app-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css',
})
export class AlertComponent {
  readonly message = input<string>('');
  readonly heading = input<string>('');
  readonly variant = input<AlertVariant>('info');

  protected readonly glyph = computed(() => ICONS[this.variant()]);
}
