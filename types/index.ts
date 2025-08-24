export interface PriceResponse {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  issues: {
    allowance: {
      actual: string;
      spender: string;
    } | null;
    balance: {
      token: string;
      actual: string;
      expected: string;
    } | null;
  };
  tokenMetadata: {
    buyToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
    sellToken: {
      buyTaxBps: string;
      sellTaxBps: string;
    };
  };
  validationErrors?: Array<{
    field: string;
    code: number;
    reason: string;
  }>;
}

export interface QuoteResponse extends PriceResponse {
  transaction: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
  permit2: {
    type: string;
    hash: string;
    eip712: any;
  };
}