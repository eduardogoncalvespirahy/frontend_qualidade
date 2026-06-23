import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MachineComponent } from './add-configs/machine/machine.component';
import { RegistrationComponent } from './add-configs/registration/registration.component';
import { ParamComponent } from './add-configs/param/param.component';

type ConfigSection =
  | 'machine'
  | 'param'
  | 'registration';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    RouterModule,
    MachineComponent,
    RegistrationComponent,
    ParamComponent,
  ],
  templateUrl: './config.component.html',
  styleUrl: './config.component.css',
})
export class ConfigComponent {
  readonly sections = [
    {
      key: 'machine' as const,
      label: 'Máquinas',
      icon: 'bi-cpu',
      description: 'Gerenciamento das máquinas',
    },
    {
      key: 'param' as const,
      label: 'Parâmetros',
      icon: 'bi-sliders',
      description: 'Configurações do sistema',
    },
    {
      key: 'registration' as const,
      label: 'Cadastro',
      icon: 'bi-person-vcard',
      description: 'Informações cadastrais',
    },
  ];

  readonly activeSection = signal<ConfigSection>('machine');

  readonly pageTitles: Record<ConfigSection, string> = {
    machine: 'Máquinas',
    param: 'Parâmetros',
    registration: 'Cadastro',
  };

  readonly pageDescriptions: Record<ConfigSection, string> = {
    machine: 'Gerencie as máquinas vinculadas ao sistema.',
    param: 'Configure parâmetros operacionais e comportamentos.',
    registration: 'Gerencie informações cadastrais.',
  };
}