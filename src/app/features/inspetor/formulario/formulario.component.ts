import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { NavigationContextService } from '../../../core/services/navigation-context.service';

@Component({
  selector: 'app-formulario',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
})
export class FormularioComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly navigationContext = inject(NavigationContextService);


  protected readonly formularioId = signal('');
  protected readonly secaoId = signal('');
  protected readonly localId = signal('');

  constructor() {
    this.setFormularioId();
  }

  protected setFormularioId(): void {
    this.navigationContext.formnId.set(this.route.snapshot.paramMap.get('formulario_id')!);
    this.formularioId.set(this.navigationContext.formnId()!);
    this.secaoId.set(this.navigationContext.sectionId()!);
    this.localId.set(this.navigationContext.locationId()!);
  }
}
