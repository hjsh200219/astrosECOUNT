export interface EcountError {
  /** V2 uses "Code", some older docs show "ErrorCode" */
  Code?: string;
  ErrorCode?: string;
  Message: string;
  MessageDetail?: string;
}

export interface EcountResponse<T> {
  Status: number | string;
  Error: EcountError | null;
  /** Some responses include top-level Errors array */
  Errors: EcountError[] | null;
  Data: T;
  Timestamp?: string;
}

export interface EcountListData<T> {
  Result: T[];
  TotalCount: number;
  PageCount: number;
}

export interface EcountLoginData {
  Code: string;
  Datas: {
    SESSION_ID: string;
    HOST_URL: string;
    COM_CODE: string;
    USER_ID: string;
  };
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
