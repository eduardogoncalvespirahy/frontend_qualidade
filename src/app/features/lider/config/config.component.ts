import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MachineComponent } from './add-configs/machine/machine.component';
import { RegistrationComponent } from "./add-configs/registration/registration.component";
import { ParamComponent } from "./add-configs/param/param.component";

@Component({
  selector: 'app-config',
  imports: [RouterModule, MachineComponent, RegistrationComponent, ParamComponent],
  templateUrl: './config.component.html',
  styleUrl: './config.component.css',
})
export class ConfigComponent {

  activeSection: string | null = null;

  toggle(section: string) {
    this.activeSection = this.activeSection === section ? null : section;
  }
}
