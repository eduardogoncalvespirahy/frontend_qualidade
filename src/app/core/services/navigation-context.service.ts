import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavigationContextService {
  readonly locationId = signal<string | null>(null);
  readonly sectionId = signal<string | null>(null);
  readonly formnId = signal<string | null>(null);
  readonly answerId = signal<string | null>(null);
  readonly employerId = signal<string | null>(null);
  readonly machineId = signal<string | null>(null);
  readonly systemId = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly roleId = signal<string | null>(null);
}
