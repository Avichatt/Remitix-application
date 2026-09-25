export type PayoutMethod =
  | "BANK"
  | "UPI";


export type TransferDraft = {
  senderCountry: string;
  beneficiaryCountry: string;

  sourceCurrency: string;
  destinationCurrency: string;

  sourceAmount: number;
  fxRate: number;
  grossAmount: number;
  fee: number;
  recipientAmount: number;

  rateDate: string | null;
  rateSource: string;

  recipientName?: string;

  payoutMethod?: PayoutMethod;

  bankName?: string;
  accountNumber?: string;
  ifsc?: string;

  upiId?: string;
};


const STORAGE_KEY =
  "remitx_transfer_draft";


export function saveTransferDraft(
  draft: TransferDraft
) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(draft)
  );
}


export function getTransferDraft():
  TransferDraft | null {

  if (typeof window === "undefined") {
    return null;
  }


  const stored =
    sessionStorage.getItem(
      STORAGE_KEY
    );


  if (!stored) {
    return null;
  }


  try {

    const parsed =
      JSON.parse(
        stored
      ) as TransferDraft;


    if (
      !parsed.senderCountry ||
      !parsed.beneficiaryCountry
    ) {

      sessionStorage.removeItem(
        STORAGE_KEY
      );

      return null;
    }


    return parsed;

  } catch {

    sessionStorage.removeItem(
      STORAGE_KEY
    );

    return null;
  }
}


export function updateTransferDraft(
  updates: Partial<TransferDraft>
) {

  const current =
    getTransferDraft();


  if (!current) {
    return;
  }


  saveTransferDraft({
    ...current,
    ...updates,
  });
}


export function clearTransferDraft() {

  if (typeof window === "undefined") {
    return;
  }


  sessionStorage.removeItem(
    STORAGE_KEY
  );
}