export interface CredentialLocation { //relacionamento credencias + locais
  credentialId: string;
  locationId: string;
}

export interface CredentialLocationCreate {
  credentialId: string;
  locationId: string;
}

export interface CredentialLocationUpdate {
  credentialId?: string;
  locationId?: string;
}
