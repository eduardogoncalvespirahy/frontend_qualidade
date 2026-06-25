import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LocalComponent } from './itens/local/local.component';
import { SecaoComponent } from './itens/secao/secao.component';
import { FormularioComponent } from './itens/formulario/formulario.component';

type ConfigSection = 'location' | 'section' | 'form';

@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [RouterModule, LocalComponent, SecaoComponent, FormularioComponent],
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent {
  readonly sections = [
    {
      key: 'location' as const,
      label: 'Locais',
      icon: 'bi-cpu',
      description: 'Gerenciamento dos Locais',
    },
    {
      key: 'section' as const,
      label: 'Seções',
      icon: 'bi-sliders',
      description: 'Gerenciamento das Seções',
    },
    {
      key: 'form' as const,
      label: 'Formularios',
      icon: 'bi-person-vcard',
      description: 'Gerenciamento dos Formularios',
    },
  ];

  readonly activeSection = signal<ConfigSection>('location');

  readonly pageTitles: Record<ConfigSection, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formularios',
  };

  readonly pageDescriptions: Record<ConfigSection, string> = {
    location: 'Gerencie os locais vinculados ao sistema.',
    section: 'Gerencie os seções vinculados ao sistema.',
    form: 'Gerencie os formularios vinculados ao sistema.',
  };
}
