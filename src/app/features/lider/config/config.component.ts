import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MachineComponent } from './add-configs/machine/machine.component';
import { RegistrationComponent } from './add-configs/registration/registration.component';
import { ParamComponent } from './add-configs/param/param.component';
import { LocationComponent } from './add-configs/location/location.component';
import { SectionComponent } from './add-configs/section/section.component';
import { FormComponent } from './add-configs/form/form.component';

type ConfigSection =
  | 'location'
  | 'section'
  | 'form'
  | 'machine'
  | 'param'
  | 'registration';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    RouterModule,
    LocationComponent,
    SectionComponent,
    FormComponent,
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
      key: 'location' as const,
      label: 'Locais',
      icon: 'bi-cpu',
      description: 'Gerenciamento dos Locais',
    },
    {
      key: 'section' as const,
      label: 'Seções',
      icon: 'bi-cpu',
      description: 'Gerenciamento das Seções',
    },
    {
      key: 'form' as const,
      label: 'Formularios',
      icon: 'bi-cpu',
      description: 'Gerenciamento dos Formularios',
    },        
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

  readonly activeSection = signal<ConfigSection>('location');

  readonly pageTitles: Record<ConfigSection, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formularios',
    machine: 'Máquinas',
    param: 'Parâmetros',
    registration: 'Cadastro',
  };

  readonly pageDescriptions: Record<ConfigSection, string> = {

    location: 'Gerencie os locais vinculadas ao sistema.',
    section: 'Gerencie as seções vinculadas ao sistema.',
    form: 'Gerencie os formularios vinculadas ao sistema.',    
    machine: 'Gerencie as máquinas vinculadas ao sistema.',
    param: 'Configure parâmetros operacionais e comportamentos.',
    registration: 'Gerencie informações cadastrais.',
  };
}