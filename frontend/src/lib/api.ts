const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";


export type PaymentRequest = {
  sender_country: string;
  beneficiary_country: string;

  source_currency: string;
  destination_currency: string;

  amount: number;
};


export type RouteInformation = {
  route_id: string;
  route_name: string;
  route_fee: number;
  estimated_seconds: number;
  liquidity_score: number;
};


export type DrunixSettlement = {
  docType?: string;

  transactionId?: string;

  senderCountry?: string;
  beneficiaryCountry?: string;

  sourceCurrency?: string;
  sourceAmount?: number;

  destinationCurrency?: string;
  destinationAmount?: number;

  fxRate?: number;

  riskStatus?: string;

  routeId?: string;

  settlementStatus?: string;

  eventSequence?: number;

  createdAt?: string;
  updatedAt?: string;
};


export type PaymentResponse = {
  transaction_id: string;

  source_amount: number;
  source_currency: string;

  destination_currency: string;

  fx_rate: number;

  rate_date: string | null;
  rate_source: string;

  gross_amount: number;
  fee: number;
  final_amount: number;

  status: string;

  risk_score: number | null;
  risk_level: string | null;
  risk_decision: string | null;

  risk_reasons: string[];

  selected_route:
    | RouteInformation
    | null;

  drunix: {
    submitted: boolean;

    settlement:
      | DrunixSettlement
      | null;

    error:
      | string
      | null;
  };
};


export type TransactionRecord = {
  transaction_id: string;

  sender_country: string;
  beneficiary_country: string;

  source_currency: string;
  source_amount: number;

  destination_currency: string;
  destination_amount: number;

  fx_rate: number;
  fee: number;

  status: string;

  risk_score: number | null;
  risk_level: string | null;
  risk_decision: string | null;

  route_id: string | null;
  drunix_status: string | null;

  created_at: string | null;
};


export type TransactionListResponse = {
  count: number;

  transactions:
    TransactionRecord[];
};


export type PaymentStats = {
  total_transactions: number;
  drunix_committed: number;
  review_required: number;
  blocked: number;
  submission_failed: number;
  risk_approved: number;
};


export type AuditEvent = {
  docType?: string;

  eventType?: string;

  timestamp?: string;

  ledgerTxId?: string;

  eventNumber?: number;

  transactionId?: string;

  settlementStatus?: string;
};


export type SettlementProof = {
  verified: boolean;

  proof_type?: string;

  transaction_id: string;

  application_status?: string;

  risk_decision?: string | null;

  message?: string;

  payment?: {
    sender_country: string;
    beneficiary_country: string;

    source_currency: string;
    source_amount: number;

    destination_currency: string;
    destination_amount: number;

    fx_rate: number;
    fee: number;
  };

  risk?: {
    score: number | null;
    level: string | null;
    decision: string | null;
  };

  route?: {
    route_id: string | null;
  };

  drunix?: {
    channel?: string;
    chaincode?: string;

    settlement_status?: string;

    event_sequence?: number;

    created_at?: string;
    updated_at?: string;
  };

  latest_ledger_event?:
    | AuditEvent
    | null;

  settlement?:
    | DrunixSettlement
    | null;

  audit: {
    event_count: number;

    events:
      AuditEvent[];
  };
};


export type SettlementLifecycleStatus =
  | "SETTLEMENT_PROCESSING"
  | "SETTLED"
  | "PAYOUT_COMPLETED";


export type SettlementStatusResponse = {
  success: boolean;

  transaction_id: string;

  previous_status: string;

  status: string;

  drunix_status: string;

  reconciled_before_update?: boolean;

  drunix: DrunixSettlement;
};


async function parseError(
  response: Response
): Promise<string> {

  try {

    const data =
      await response.json();


    if (
      typeof data.detail ===
      "string"
    ) {
      return data.detail;
    }


    if (
      typeof data.error ===
      "string"
    ) {
      return data.error;
    }


    if (
      Array.isArray(
        data.detail
      )
    ) {

      return data.detail
        .map(
          (
            item: {
              msg?: string;
            }
          ) =>
            item.msg ??
            "Validation error"
        )
        .join(", ");

    }

  } catch {
    // Ignore JSON parsing error.
  }


  return (
    `Request failed with status ${response.status}.`
  );
}


// -------------------------------------------------
// CREATE PAYMENT
// -------------------------------------------------

export async function createPayment(
  payment: PaymentRequest
): Promise<PaymentResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          payment
        ),
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}


// -------------------------------------------------
// GET TRANSACTION
// -------------------------------------------------

export async function getTransaction(
  transactionId: string
): Promise<TransactionRecord> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments/${transactionId}`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}


// -------------------------------------------------
// LIST TRANSACTIONS
// -------------------------------------------------

export async function getTransactions(
  limit = 50
): Promise<TransactionListResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments?limit=${limit}`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}


// -------------------------------------------------
// STATS
// -------------------------------------------------

export async function getPaymentStats():
  Promise<PaymentStats> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments/stats`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}


// -------------------------------------------------
// SETTLEMENT PROOF
// -------------------------------------------------

export async function getSettlementProof(
  transactionId: string
): Promise<SettlementProof> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments/${transactionId}/proof`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}


// -------------------------------------------------
// UPDATE SETTLEMENT LIFECYCLE
// -------------------------------------------------

export async function updateSettlementStatus(
  transactionId: string,
  status: SettlementLifecycleStatus
): Promise<SettlementStatusResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/payments/${transactionId}/settlement-status`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          status,
        }),
      }
    );


  if (!response.ok) {

    throw new Error(
      await parseError(
        response
      )
    );

  }


  return response.json();
}