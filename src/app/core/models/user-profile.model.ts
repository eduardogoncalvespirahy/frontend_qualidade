export interface UserProfile {
  userId: string;
  userUsername: string;
  userEmail: string;
  userStatus: number;

  employeeId: string;
  employeeNome: string;
  employeeMatricula: string;
  employeeDataAdmissao: Date | string;

  employerId: string;

  locationId: string;
  locationName: string;

  departmentId: string;
  departmentNome: string;

  jobPositionId: string;
  jobPositionNome: string;

  workstationGroupId: string;
  workstationGroupNome: string;

  workshiftId: string;
  workshiftDescricao: string;

  costCenterId: string;
  costCenterNome: string;

  ultimaSincronizacao: Date | string | null;
}