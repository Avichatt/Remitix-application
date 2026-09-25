"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createPayment,
} from "@/lib/api";

import {
  getTransferDraft,
  type TransferDraft,
} from "@/lib/transferDraft";


const COUNTRY_NAMES:
  Record<string, string> = {

  AE: "United Arab Emirates",
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
};


export default function ReviewPage() {

  const router =
    useRouter();


  const [draft, setDraft] =
    useState<TransferDraft | null>(
      null
    );


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [error, setError] =
    useState("");


  useEffect(() => {

    const stored =
      getTransferDraft();


    if (!stored) {

      router.replace("/");

      return;
    }


    setDraft(stored);

  }, [router]);


  if (!draft) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        Loading transfer...
      </div>
    );
  }


  const accountEnding =
    draft.accountNumber
      ? draft.accountNumber.slice(
          -4
        )
      : "";


  const senderCountryName =
    COUNTRY_NAMES[
      draft.senderCountry
    ] ??
    draft.senderCountry;


  const beneficiaryCountryName =
    COUNTRY_NAMES[
      draft.beneficiaryCountry
    ] ??
    draft.beneficiaryCountry;


  async function confirmTransfer() {

    if (submitting) {
      return;
    }


    setError("");

    setSubmitting(true);


    try {

      if (
        !draft.senderCountry ||
        !draft.beneficiaryCountry
      ) {

        throw new Error(
          "Transfer country information is missing. Please start the transfer again."
        );
      }


      const result =
        await createPayment({
          sender_country:
            draft.senderCountry,

          beneficiary_country:
            draft.beneficiaryCountry,

          source_currency:
            draft.sourceCurrency,

          destination_currency:
            draft.destinationCurrency,

          amount:
            draft.sourceAmount,
        });


      router.push(
        `/transfer/${result.transaction_id}`
      );

    } catch (requestError) {

      if (
        requestError instanceof Error
      ) {

        setError(
          requestError.message
        );

      } else {

        setError(
          "Unable to submit the transfer."
        );
      }

    } finally {

      setSubmitting(false);
    }
  }


  return (

    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/recipient"
              )
            }
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            ← Edit recipient
          </button>


          <Logo />


          <div className="w-24" />

        </div>

      </header>


      <div className="mx-auto max-w-5xl px-6 py-12">

        <ProgressSteps
          activeStep={3}
        />


        <div className="mx-auto mt-10 max-w-xl">

          <p className="text-sm font-semibold text-blue-600">
            STEP 3 OF 4
          </p>


          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Review your transfer
          </h1>


          <p className="mt-3 text-sm leading-6 text-slate-500">
            Check the transfer and
            recipient information before
            confirming.
          </p>


          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

            {/* AMOUNT */}

            <div className="bg-slate-950 p-7 text-white">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recipient gets
              </p>


              <p className="mt-2 text-4xl font-bold">
                {
                  draft.recipientAmount
                }{" "}
                {
                  draft.destinationCurrency
                }
              </p>


              <p className="mt-3 text-sm text-slate-400">
                Reference quote
              </p>

            </div>


            <div className="p-7">

              {/* CORRIDOR */}

              <div className="rounded-2xl bg-slate-50 p-5">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Transfer route
                </p>


                <div className="mt-4 flex items-center justify-between gap-4">

                  <div>

                    <p className="text-sm font-semibold text-slate-950">
                      {senderCountryName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {draft.sourceCurrency}
                    </p>

                  </div>


                  <div className="text-slate-400">
                    →
                  </div>


                  <div className="text-right">

                    <p className="text-sm font-semibold text-slate-950">
                      {beneficiaryCountryName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {draft.destinationCurrency}
                    </p>

                  </div>

                </div>

              </div>


              {/* TRANSFER */}

              <div className="mt-7 space-y-4">

                <Row
                  label="You send"
                  value={
                    `${draft.sourceAmount} ${draft.sourceCurrency}`
                  }
                />


                <Row
                  label="Reference rate"
                  value={
                    `1 ${draft.sourceCurrency} = ${draft.fxRate} ${draft.destinationCurrency}`
                  }
                />


                <Row
                  label="REMITX fee"
                  value={
                    `${draft.fee} ${draft.destinationCurrency}`
                  }
                />

              </div>


              {/* RECIPIENT */}

              <div className="mt-7 border-t border-slate-100 pt-7">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recipient
                </p>


                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {draft.recipientName}
                </p>


                {draft.payoutMethod ===
                  "BANK" && (

                  <div className="mt-3 space-y-2 text-sm text-slate-600">

                    <p>
                      Bank account
                    </p>


                    <p>
                      {draft.bankName}
                    </p>


                    <p>
                      Account ••••{" "}
                      {accountEnding}
                    </p>


                    {draft.ifsc && (

                      <p>
                        IFSC{" "}
                        {draft.ifsc}
                      </p>

                    )}

                  </div>

                )}


                {draft.payoutMethod ===
                  "UPI" && (

                  <div className="mt-3 text-sm text-slate-600">

                    <p>
                      UPI
                    </p>


                    <p className="mt-1">
                      {maskUpi(
                        draft.upiId ??
                          ""
                      )}
                    </p>

                  </div>

                )}

              </div>


              {/* IMPORTANT */}

              <div className="mt-7 border-t border-slate-100 pt-7">

                <div className="rounded-xl bg-amber-50 p-4">

                  <p className="text-sm font-semibold text-amber-900">
                    Final amount may be
                    recalculated
                  </p>


                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    The quote shown above
                    is a reference quote.
                    REMITX will calculate
                    the current rate again
                    when you confirm.
                  </p>

                </div>

              </div>


              {/* PRIVACY */}

              <div className="mt-4 rounded-xl bg-blue-50 p-4">

                <p className="text-sm font-semibold text-blue-900">
                  Settlement privacy
                </p>


                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Sensitive beneficiary
                  information is not sent
                  to the shared Drunix
                  settlement ledger.
                </p>

              </div>


              {/* ERROR */}

              {error && (

                <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>

              )}


              {/* CONFIRM */}

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  confirmTransfer
                }
                className="mt-7 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >

                {submitting
                  ? "Submitting transfer..."
                  : "Confirm and send money →"}

              </button>


              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  router.push(
                    "/recipient"
                  )
                }
                className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
              >
                Edit recipient
              </button>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}


function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div className="flex items-start justify-between gap-6 text-sm">

      <span className="text-slate-500">
        {label}
      </span>


      <span className="text-right font-semibold text-slate-900">
        {value}
      </span>

    </div>
  );
}


function maskUpi(
  upiId: string
) {

  const [
    name,
    provider,
  ] = upiId.split("@");


  if (
    !name ||
    !provider
  ) {

    return "••••••";
  }


  return (
    `${name.slice(0, 2)}••••@${provider}`
  );
}


function Logo() {

  return (

    <div className="flex items-center gap-3">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
        RX
      </div>


      <p className="font-bold text-slate-950">
        REMIT
        <span className="text-blue-600">
          X
        </span>
      </p>

    </div>
  );
}


function ProgressSteps({
  activeStep,
}: {
  activeStep: number;
}) {

  const steps = [
    "Amount",
    "Recipient",
    "Review",
    "Track",
  ];


  return (

    <div className="flex items-center justify-center gap-2 text-xs sm:gap-3 sm:text-sm">

      {steps.map(
        (
          step,
          index
        ) => {

          const number =
            index + 1;


          const active =
            number ===
            activeStep;


          const complete =
            number <
            activeStep;


          return (

            <div
              key={step}
              className="contents"
            >

              <div className="flex items-center gap-2">

                <div
                  className={
                    active
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 font-bold text-white"
                      : complete
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 font-bold text-white"
                        : "flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500"
                  }
                >

                  {complete
                    ? "✓"
                    : number}

                </div>


                <span
                  className={
                    active
                      ? "font-semibold text-blue-700"
                      : complete
                        ? "font-semibold text-emerald-700"
                        : "text-slate-400"
                  }
                >

                  {step}

                </span>

              </div>


              {index <
                steps.length - 1 && (

                <div className="h-px w-3 bg-slate-200 sm:w-8" />

              )}

            </div>
          );
        }
      )}

    </div>
  );
}