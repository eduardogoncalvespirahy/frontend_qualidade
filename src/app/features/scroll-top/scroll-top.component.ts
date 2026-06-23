import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  standalone: true,
  templateUrl: './scroll-top.component.html',
  styleUrl: './scroll-top.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollTopComponent {
  protected readonly visible = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.visible.set(window.scrollY > 300);
  }

  protected scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}
