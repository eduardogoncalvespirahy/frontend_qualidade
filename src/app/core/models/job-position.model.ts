export interface JobPosition { // Cargo - Senior
  id: string;
  name: string | null;
}

export interface JobPositionCreate {
  id: string;
  name?: string | null;
}

export interface JobPositionUpdate {
  name?: string | null;
}
