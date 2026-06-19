export interface Department { //departamentos - senior
  id: string;
  name: string | null;
}

export interface DepartmentCreate {
  id: string;
  name?: string | null;
}

export interface DepartmentUpdate {
  name?: string | null;
}
