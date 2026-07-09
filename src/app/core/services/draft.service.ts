import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { FormDraft, CreateFormDraft } from '../models/form-draft.model';

@Injectable({ providedIn: 'root' })
export class DraftService {
  // Precisamos do HttpClient para fazer chamadas HTTP ao backend
  private readonly http = inject(HttpClient);

  // URL base do endpoint de rascunhos definida no environment
  private readonly apiUrl = `${environment.apiUrl}/form-drafts`;

  /**
   * Busca o rascunho de um formulário no banco.
   * Retorna Observable porque a resposta vem da rede (assíncrono).
   * Retorna null se não existir ou der erro — evita quebrar o fluxo.
   */
  load$(formId: string): Observable<Record<string, string> | null> {
    return this.http.get<FormDraft>(`${this.apiUrl}/${formId}`).pipe(
      // map transforma a resposta: pega o campo rascunhoData (string JSON)
      // e converte de volta para objeto { answerId: valor }
      map((draft) => {
        if (!draft?.rascunhoData) return null;
        // A coluna é do tipo json no banco — o pg já retorna como objeto JS,
        // não como string. Verificamos o tipo antes de tentar JSON.parse.
        if (typeof draft.rascunhoData === 'object') {
          return draft.rascunhoData as unknown as Record<string, string>;
        }
        try {
          // fallback caso venha como string em algum cenário
          return JSON.parse(draft.rascunhoData) as Record<string, string>;
        } catch {
          return null;
        }
      }),
      // catchError garante que um 404 (rascunho não existe) não quebre o app
      // simplesmente retorna null, que o painel trata como "sem rascunho"
      catchError(() => of(null)),
    );
  }

  /**
   * Salva o rascunho no banco (upsert: cria se não existe, atualiza se já existe).
   * É fire-and-forget: não precisamos esperar a resposta para continuar.
   * Chamado a cada tecla digitada, então não pode bloquear o usuário.
   */
  save(formId: string, data: Record<string, string>): void {
    // Convertemos o objeto de respostas para string JSON antes de mandar ao banco
    const rascunhoData = JSON.stringify(data);

    // Primeiro verifica se já existe um rascunho para este formulário
    this.http.get<FormDraft>(`${this.apiUrl}/${formId}`).pipe(
      // catchError aqui trata o 404: se não existe, retorna null
      catchError(() => of(null)),
      // switchMap recebe o resultado do GET e decide o próximo passo
      switchMap((existing) => {
        if (existing) {
          // já existe → atualiza com PUT
          return this.http.put<FormDraft>(`${this.apiUrl}/${formId}`, { formId, rascunhoData });
        } else {
          // não existe → cria com POST
          const dto: CreateFormDraft = { formId, rascunhoData };
          return this.http.post<FormDraft>(this.apiUrl, dto);
        }
      }),
      // catchError final: se o save falhar (rede fora etc.), ignora silenciosamente
      catchError(() => of(null)),
    ).subscribe(); // subscribe sem callbacks = fire-and-forget
  }

  /**
   * Remove o rascunho do banco.
   * Chamado após envio da inspeção ou ao descartar manualmente.
   * Também fire-and-forget: se falhar, não impacta o usuário.
   */
  clear(formId: string): void {
    this.http.delete(`${this.apiUrl}/${formId}`).pipe(
      catchError(() => of(null)),
    ).subscribe();
  }
}
