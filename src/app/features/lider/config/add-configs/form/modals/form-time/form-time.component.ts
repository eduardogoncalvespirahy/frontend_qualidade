import { Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormTime } from '../../../../../../../core/models/form-time.model';

@Component({
  selector: 'app-form-time',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './form-time.component.html',
})
export class FormTimeComponent implements OnInit {
  readonly existing = input<FormTime | null>(null);

  // input type="time" retorna "HH:MM"; enviamos "HH:MM:SS" para o banco
  protected tempoExecucao: string | null = null;
  protected tempoTolerancia: string | null = null;
  protected tempoAntecependem: string | null = null;

  // "HH:MM" → "HH:MM:SS"
  private toTime(t: string | null): string | null {
    if (!t) return null;
    return t.length === 5 ? `${t}:00` : t;
  }

  // "HH:MM:SS" → "HH:MM" para o input
  private fromTime(t: unknown): string | null {
    if (!t || typeof t !== 'string') return null;
    return t.slice(0, 5);
  }

  ngOnInit(): void {
    const e = this.existing();
    if (e) {
      this.tempoExecucao = this.fromTime(e.tempoExecucao);
      this.tempoTolerancia = this.fromTime(e.tempoTolerancia);
      this.tempoAntecependem = this.fromTime(e.tempoAntecependem);
    }
  }

  value() {
    return {
      tempoExecucao: this.toTime(this.tempoExecucao),
      tempoTolerancia: this.toTime(this.tempoTolerancia),
      tempoAntecependem: this.toTime(this.tempoAntecependem),
    };
  }
}
