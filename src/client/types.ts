export interface EcountError {
  ErrorCode: string;
  Message: string;
}

export interface EcountResponse<T> {
  Status: string;
  Error: EcountError | null;
  Data: T;
}

export interface EcountListData<T> {
  Result: T[];
  TotalCount: number;
  PageCount: number;
}

export interface SessionInfo {
  SESSION_ID: string;
}

export interface LoginParams {
  COM_CODE: string;
  USER_ID: string;
  API_CERT_KEY: string;
  LAN_TYPE: string;
  ZONE: string;
}
