import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  output,
  signal,
} from '@angular/core';
@Component({
  selector: 'app-signature',
  standalone: true,
  imports: [],
  templateUrl: './signature.component.html',
  styleUrl: './signature.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignatureComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('wrapper', { static: true })
  private wrapperRef!: ElementRef<HTMLDivElement>;

  @ViewChild('signatureBody', { static: true })
  private bodyRef!: ElementRef<HTMLDivElement>;

  /**
   * Emite a assinatura sempre que ela é alterada.
   * String em Base64 (PNG)
   */
  readonly signatureChange = output<string>();

  /**
   * Estado da tela cheia
   */
  protected readonly fullscreen = signal(false);

  private ctx!: CanvasRenderingContext2D;

  private drawing = false;

  private hasSignature = false;

  private resizeObserver!: ResizeObserver;

  ngAfterViewInit(): void {
    this.initializeCanvas();

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    this.resizeObserver.observe(this.bodyRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  // ============================================================
  // Inicialização
  // ============================================================

  private initializeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;

    this.ctx = canvas.getContext('2d')!;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#111827';

    this.resizeCanvas();
  }

  /**
   * Mantém a qualidade em telas Retina
   */
  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;

    const rect = canvas.parentElement!.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;

    // Salva o desenho
    const image = this.hasSignature ? canvas.toDataURL('image/png') : null;

    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    this.ctx = canvas.getContext('2d')!;

    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#111827';

    if (image) {
      const img = new Image();

      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };

      img.src = image;
    }

    console.table({
      cssWidth: rect.width,
      cssHeight: rect.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });
  }

  // ============================================================
  // Fullscreen
  // ============================================================

  protected async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await this.wrapperRef.nativeElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }

    // Garante um resize após a mudança de layout
    requestAnimationFrame(() => {
      this.resizeCanvas();
    });
  }

  @HostListener('document:fullscreenchange')
  protected onFullscreenChange(): void {
    this.fullscreen.set(!!document.fullscreenElement);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.resizeCanvas();
      });
    });
  }

  // ============================================================
  // Eventos Pointer
  // ============================================================

  protected start(event: PointerEvent): void {
    event.preventDefault();

    this.drawing = true;

    const pos = this.getPosition(event);

    this.ctx.beginPath();

    this.ctx.moveTo(pos.x, pos.y);
  }

  protected draw(event: PointerEvent): void {
    if (!this.drawing) {
      return;
    }

    event.preventDefault();

    const pos = this.getPosition(event);

    this.ctx.lineTo(pos.x, pos.y);

    this.ctx.stroke();

    this.hasSignature = true;
  }

  protected stop(): void {
    if (!this.drawing) {
      return;
    }

    this.drawing = false;

    this.emitSignature();
  }

  // ============================================================
  // Limpar
  // ============================================================

  protected clear(): void {
    const canvas = this.canvasRef.nativeElement;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.hasSignature = false;

    this.signatureChange.emit('');
  }

  // ============================================================
  // API Pública
  // ============================================================

  public isEmpty(): boolean {
    return !this.hasSignature;
  }

  public getSignature(): string {
    if (!this.hasSignature) {
      return '';
    }

    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  /**
   * Retorna um Blob PNG.
   * Muito melhor para enviar ao backend.
   */
  public toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvasRef.nativeElement.toBlob(
        (blob) => resolve(blob),

        'image/png',
      );
    });
  }

  // ============================================================
  // Utilidades
  // ============================================================

  private emitSignature(): void {
    this.signatureChange.emit(this.getSignature());
  }

  private getPosition(event: PointerEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,

      y: event.clientY - rect.top,
    };
  }
}
