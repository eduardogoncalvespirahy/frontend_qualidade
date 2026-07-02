import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MachineComponent } from './add-configs/machine/machine.component';
import { RegistrationComponent } from './add-configs/registration/registration.component';
import { ParamComponent } from './add-configs/param/param.component';
import { LocationComponent } from './add-configs/location/location.component';
import { SectionComponent } from './add-configs/section/section.component';
import { FormComponent } from './add-configs/form/form.component';

import { AuthService } from '../../../core/services/auth.service';

type ConfigSection = 'section' | 'form' | 'machine' | 'param' | 'location' | 'registration';

interface ConfigItem {
  key: ConfigSection;
  label: string;
  icon: string;
  description: string;
  /** Se definido, a seção só aparece para quem tiver uma dessas roles. */
  roles?: string[];
}

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
  private readonly auth = inject(AuthService);

  private readonly allSections: ConfigItem[] = [
    {
      key: 'section',
      label: 'Seções',
      icon: 'bi-building',
      description: 'Gerenciamento das Seções',
    },
    {
      key: 'form',
      label: 'Formularios',
      icon: 'bi-file-bar-graph',
      description: 'Gerenciamento dos Formularios',
    },
    {
      key: 'machine',
      label: 'Máquinas',
      icon: 'bi-cpu',
      description: 'Gerenciamento das máquinas',
    },
    {
      key: 'param',
      label: 'Parâmetros',
      icon: 'bi-sliders',
      description: 'Configurações do sistema',
    },
    {
      key: 'location',
      label: 'Locais',
      icon: 'bi-geo-alt',
      description: 'Gerenciamento dos Locais',
      roles: ['ADMIN'],      
    },    
    {
      key: 'registration',
      label: 'Cadastro',
      icon: 'bi-person-vcard',
      description: 'Informações cadastrais',
      roles: ['ADMIN'],
    },
  ];

  /** Seção pode ser acessada pela credencial logada? */
  canAccess(key: ConfigSection): boolean {
    const item = this.allSections.find((s) => s.key === key);
    if (!item) return false;
    return !item.roles?.length || this.auth.hasAnyRole(...item.roles);
  }

  /** Apenas as seções que a credencial pode ver (usada na navegação). */
  readonly sections = computed(() =>
    this.allSections.filter((s) => !s.roles?.length || this.auth.hasAnyRole(...s.roles)),
  );

  readonly activeSection = signal<ConfigSection>('location');

  constructor() {
    // Se a seção ativa deixar de ser permitida (ex.: perda de role/sessão),
    // volta para uma seção segura.
    effect(() => {
      if (!this.canAccess(this.activeSection())) {
        this.activeSection.set('location');
      }
    });
  }

  /** Troca de seção com checagem de permissão. */
  select(key: ConfigSection): void {
    if (this.canAccess(key)) {
      this.activeSection.set(key);
    }
  }

  readonly pageTitles: Record<ConfigSection, string> = {    
    section: 'Seções',
    form: 'Formularios',
    machine: 'Máquinas',
    param: 'Parâmetros',
    location: 'Locais',    
    registration: 'Cadastro',
  };

  readonly pageDescriptions: Record<ConfigSection, string> = {    
    section: 'Gerencie as seções vinculadas ao sistema.',
    form: 'Gerencie os formularios vinculadas ao sistema.',
    machine: 'Gerencie as máquinas vinculadas ao sistema.',
    param: 'Configure parâmetros operacionais e comportamentos.',
    location: 'Gerencie os locais vinculadas ao sistema.',    
    registration: 'Gerencie informações cadastrais.',
  };
}