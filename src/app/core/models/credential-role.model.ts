export interface CredentialRole { //relacionamento credencias + regras
  credentialId: string;
  roleId: string;
}

export interface CredentialRoleCreate {
  credentialId: string;
  roleId: string;
}

export interface CredentialRoleUpdate {
  credentialId?: string;
  roleId?: string;
}
