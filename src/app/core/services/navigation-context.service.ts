import { Injectable, signal } from '@angular/core';
import { NavigationContext } from '../models/navigation-context.model';

@Injectable({
  providedIn: 'root',
})
export class NavigationContextService {
  private readonly STORAGE_KEY = 'navigation-context';

  readonly context = signal<NavigationContext>(this.load());

  update(partial: Partial<NavigationContext>): void {
    const newValue = {
      ...this.context(),
      ...partial,
    };

    this.context.set(newValue);

    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(newValue));
  }

  clear(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);

    this.context.set({
      locationId: '',
      sectionId: '',
      formId: '',
      answerId: '',
      employerId: '',
      machineId: '',
      systemId: '',
      userId: '',
      roleId: '',
    });
  }

  private load(): NavigationContext {
    const data = sessionStorage.getItem(this.STORAGE_KEY);

    if (!data) {
      return {
        locationId: '',
        sectionId: '',
        formId: '',
        answerId: '',
        employerId: '',
        machineId: '',
        systemId: '',
        userId: '',
        roleId: '',
      };
    }

    return JSON.parse(data);
  }
}
