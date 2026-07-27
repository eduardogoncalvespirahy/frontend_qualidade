import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PackageUnitConversion } from '../../../../../../../core/models/package-unit-conversions.model';
import { InputUnits } from '../../../../../../../core/models/input-units.model';
import { PackageTypes } from '../../../../../../../core/models/package-types.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<PackageUnitConversion | null>(null);
  readonly inputUnits = input<InputUnits[]>([]);
  readonly packageTypes = input<PackageTypes[]>([]);

  protected id = '';
  protected inputUnitId = '';
  protected packageTypeId = '';
  protected ordem = '';
  protected quantidadePorSaco = '';
  protected status = true;

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.inputUnitId = u.inputUnitId;
      this.packageTypeId = u.packageTypeId;
      this.ordem = String(u.ordem);
      this.quantidadePorSaco = String(u.quantidadePorSaco);
      this.status = u.status === 1;
    }
  }

  value() {
    return {
      id: this.id,
      inputUnitId: this.inputUnitId,
      packageTypeId: this.packageTypeId,
      ordem: Number(this.ordem),
      quantidadePorSaco: Number(this.quantidadePorSaco),
      status: this.status ? 1 : 0,
    };
  }
}
