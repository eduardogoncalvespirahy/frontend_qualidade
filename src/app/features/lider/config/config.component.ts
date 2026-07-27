import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MachineComponent } from './add-configs/machine/machine.component';
import { RegistrationComponent } from './add-configs/registration/registration.component';
import { ParamComponent } from './add-configs/param/param.component';
import { LocationComponent } from './add-configs/location/location.component';
import { SectionComponent } from './add-configs/section/section.component';
import { FormComponent } from './add-configs/form/form.component';
import { InputUnitsComponent } from './add-configs/input-units/input-units.component';
import { AnswerConversionsComponent } from './add-configs/answer-conversions/answer-conversions.component';
import { PackageTypesComponent } from './add-configs/package-types/package-types.component';
import { PackageUnitConversionsComponent } from './add-configs/package-unit-conversions/package-unit-conversions.component';
import { AnswerCalculatedComponent } from './add-configs/answer-calculated/answer-calculated.component';

import { AuthService } from '../../../core/services/auth.service';

type ConfigSection = 'section' | 'form' | 'param' | 'machine' | 'location' | 'registration' | 'packagetypes' |
                     'unitinput' | 'packageunitconversion' | 'answerconversion' | 'answercalculated' ;

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
  PackageTypesComponent,          
  InputUnitsComponent,             
  PackageUnitConversionsComponent, 
  AnswerConversionsComponent,      
  AnswerCalculatedComponent
],

  templateUrl: './config.component.html',
  styleUrl: './config.component.css',
})
export class ConfigComponent {
  private readonly auth = inject(AuthService);

  private readonly allSections: ConfigItem[] = [
    {
      key: 'location',
      label: 'Locais',
      icon: 'bi-geo-alt',
      description: 'Gerenciamento dos Locais',
      roles: ['ADMIN'],      
    },    
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
      key: 'param',
      label: 'Parâmetros',
      icon: 'bi-sliders',
      description: 'Configurações do sistema',
    },
    {
      key: 'machine',
      label: 'Máquinas',
      icon: 'bi-cpu',
      description: 'Gerenciamento das máquinas',
    },    
    {
      key: 'registration',
      label: 'Cadastro',
      icon: 'bi-person-vcard',
      description: 'Informações cadastrais',
      roles: ['ADMIN'],
    },
    {
      key: 'packagetypes',
      label: 'Tipos de Pacotes',
      icon: 'bi-boxes',
      description: 'Gerencie tipos de pacotes (Pacotes, Fardos, Sacos)',
    },
    {
      key: 'unitinput',
      label: 'Unidades de Entrada',
      icon: 'bi-bag',
      description: 'Gerencie unidades de entrada (5kg, 2kg, 1kg)',
    },
    {
      key: 'packageunitconversion',
      label: 'Conversão de Unidades',
      icon: 'bi-arrow-left-right',
      description: 'Configure as conversões entre unidades',
    },
    {
      key: 'answerconversion',
      label: 'Parâmetros de Conversão',
      icon: 'bi-link-45deg',
      description: 'Vincule parâmetros às conversões',
    },
    {
      key: 'answercalculated',
      label: 'Parametros de Calculos',
      icon: 'bi-link-45deg',
      description: 'Vincule parametros para calculos',
    },
  ];

  readonly currentSection = computed(() =>
    this.allSections.find(s => s.key === this.activeSection())
  );

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

  readonly activeSection = signal<ConfigSection>('section');

  constructor() {
    // Se a seção ativa deixar de ser permitida (ex.: perda de role/sessão),
    // volta para uma seção segura.
    effect(() => {
      if (!this.canAccess(this.activeSection())) {
        this.activeSection.set('section');
      }
    });
  }

  /** Troca de seção com checagem de permissão. */
  select(key: ConfigSection): void {
    if (this.canAccess(key)) {
      this.activeSection.set(key);
    }
  }

}