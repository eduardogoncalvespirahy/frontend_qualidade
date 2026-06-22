import { Component, ViewChild, ViewContainerRef, signal } from '@angular/core';

@Component({
  selector: 'app-modal-host',
  standalone: true,
  imports: [],
  templateUrl: './modal-host.component.html',
  styleUrl: './modal-host.component.css',
})
export class ModalHostComponent {
  title = signal('');
  size = signal<'sm' | 'lg' | 'xl' | undefined>(undefined);
  centered = signal(false);

  @ViewChild('container', {
    read: ViewContainerRef,
    static: true,
  })
  container!: ViewContainerRef;

  close!: () => void;
}
