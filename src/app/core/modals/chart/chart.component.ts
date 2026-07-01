import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { ChartService, ChartSpec } from '../../services/chart.service';

/**
 * Wrapper Angular para o ChartService: renderiza um `spec` num <canvas> nativo,
 * redesenhando ao mudar os dados (effect) e ao redimensionar (ResizeObserver).
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent {
  private readonly chart = inject(ChartService);
  private readonly destroyRef = inject(DestroyRef);

  readonly spec = input.required<ChartSpec>();
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('cv');

  private resizeObserver?: ResizeObserver;

  constructor() {
    // Redesenha sempre que o spec mudar (após o canvas existir).
    effect(() => {
      const spec = this.spec();
      const el = this.canvasRef()?.nativeElement;
      if (el) this.chart.render(el, spec);
    });

    // Primeira renderização + observação de tamanho.
    afterNextRender(() => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      this.resizeObserver = new ResizeObserver(() => this.chart.render(el, this.spec()));
      this.resizeObserver.observe(el);
    });

    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }
}
