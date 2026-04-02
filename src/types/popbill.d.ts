declare module "popbill" {
  interface PopbillModule {
    config(options: {
      LinkID: string;
      SecretKey: string;
      IsTest: boolean;
    }): void;
    FaxService(): FaxServiceInstance;
  }

  interface FaxServiceInstance {
    sendFax(
      corpNum: string,
      sender: string,
      receiver: string,
      receiverName: string,
      filePaths: string[],
      reserveDT: string,
      senderName: string,
      adsYN: boolean,
      title: string,
      requestNum: string,
      userID: string,
      success: (receiptNum: string) => void,
      error: (err: PopbillError) => void,
    ): void;

    getFaxResult(
      corpNum: string,
      receiptNum: string,
      success: (results: FaxResult[]) => void,
      error: (err: PopbillError) => void,
    ): void;

    search(
      corpNum: string,
      sDate: string,
      eDate: string,
      state: number[],
      reserveYN: boolean,
      senderOnly: boolean,
      order: string,
      page: number,
      perPage: number,
      qString: string,
      success: (response: FaxSearchResponse) => void,
      error: (err: PopbillError) => void,
    ): void;
  }

  interface PopbillError {
    code: number;
    message: string;
  }

  interface FaxResult {
    state: number;
    result: number;
    receiveNum: string;
    receiveName: string;
    sendState: number;
    title: string;
    sendNum: string;
    senderName: string;
    receiptDT: string;
    sendDT: string;
    resultDT: string;
    fileNames: string[];
    receiptNum: string;
  }

  interface FaxSearchResponse {
    total: number;
    perPage: number;
    pageNum: number;
    pageCount: number;
    list: FaxResult[];
  }

  const popbill: PopbillModule;
  export = popbill;
}
