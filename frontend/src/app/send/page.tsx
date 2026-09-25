"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  saveTransferDraft,
} from "@/lib/transferDraft";


type Quote = {
  source_currency: string;
  destination_currency: string;

  source_amount: number;

  fx_rate: number;

  gross_amount: number;
  fee: number;
  recipient_amount: number;

  rate_date: string | null;
  rate_source: string;
};


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";


const COUNTRY_NAMES:
  Record<string, string> = {

  AE: "United Arab Emirates",
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
};


export default function SendPage() {

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          Loading...
        </div>
      }
    >
      <SendMoney />
    </Suspense>
  );
}


function SendMoney() {

  const router =
    useRouter();


  const searchParams =
    useSearchParams();


  const senderCountry =
    searchParams
      .get("senderCountry")
      ?.toUpperCase() ??
    "";


  const sourceCurrency =
    searchParams
      .get("from")
      ?.toUpperCase() ??
    "";


  const beneficiaryCountry =
    searchParams
      .get("beneficiaryCountry")
      ?.toUpperCase() ??
    "";


  const destinationCurrency =
    searchParams
      .get("to")
      ?.toUpperCase() ??
    "";


  const [amount, setAmount] =
    useState("");


  const [quote, setQuote] =
    useState<Quote | null>(
      null
    );


  const [loading, setLoading] =
    useState(false);


  const [error, setError] =
    useState("");


  const corridorIsValid =
    Boolean(
      senderCountry &&
      sourceCurrency &&
      beneficiaryCountry &&
      destinationCurrency
    );


  const senderCountryName =
    COUNTRY_NAMES[senderCountry] ??
    senderCountry;


  const beneficiaryCountryName =
    COUNTRY_NAMES[
      beneficiaryCountry
    ] ??
    beneficiaryCountry;


  // -------------------------------------------------
  // GET REAL QUOTE
  // -------------------------------------------------

  async function handleQuote(
    event: FormEvent
  ) {

    event.preventDefault();


    setError("");

    setQuote(null);


    if (!corridorIsValid) {

      setError(
        "Transfer corridor information is missing. Please choose the transfer countries again."
      );

      return;
    }


    const numericAmount =
      Number(amount);


    if (
      !numericAmount ||
      numericAmount <= 0
    ) {

      setError(
        "Enter a valid amount greater than 0."
      );

      return;
    }


    if (
      sourceCurrency ===
      destinationCurrency
    ) {

      setError(
        "Source and destination currencies must be different."
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${API_BASE_URL}/api/v1/quotes`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              source_currency:
                sourceCurrency,

              destination_currency:
                destinationCurrency,

              amount:
                numericAmount,
            }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ??
            "Unable to retrieve quote."
        );
      }


      setQuote(
        data as Quote
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
          "Unable to retrieve quote."
        );
      }

    } finally {

      setLoading(false);
    }
  }


  // -------------------------------------------------
  // SAVE QUOTE AND CONTINUE
  // -------------------------------------------------

  function continueToRecipient() {

    if (
      !quote ||
      !corridorIsValid
    ) {
      return;
    }


    saveTransferDraft({
      senderCountry:
        senderCountry,

      beneficiaryCountry:
        beneficiaryCountry,

      sourceCurrency:
        quote.source_currency,

      destinationCurrency:
        quote.destination_currency,

      sourceAmount:
        quote.source_amount,

      fxRate:
        quote.fx_rate,

      grossAmount:
        quote.gross_amount,

      fee:
        quote.fee,

      recipientAmount:
        quote.recipient_amount,

      rateDate:
        quote.rate_date,

      rateSource:
        quote.rate_source,
    });


    router.push(
      "/recipient"
    );
  }


  // -------------------------------------------------
  // FORMAT MONEY
  // -------------------------------------------------

  function formatMoney(
    value: number,
    currency: string
  ) {

    try {

      return new Intl.NumberFormat(
        "en",
        {
          style: "currency",

          currency,

          maximumFractionDigits: 2,
        }
      ).format(value);

    } catch {

      return (
        `${value.toFixed(2)} ${currency}`
      );
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
              router.push("/")
            }
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            ← Back
          </button>


          <Logo />


          <div className="w-12" />

        </div>

      </header>


      {/* PAGE */}

      <div className="mx-auto max-w-5xl px-6 py-12">

        <ProgressSteps
          activeStep={1}
        />


        <div className="mx-auto mt-10 max-w-xl">

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">

            {/* TITLE */}

            <p className="text-sm font-semibold text-blue-600">
              STEP 1 OF 4
            </p>


            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              How much do you want
              to send?
            </h1>


            <p className="mt-3 text-sm leading-6 text-slate-500">
              Get the current reference
              exchange rate and see what
              your recipient could receive.
            </p>


            {/* CORRIDOR */}

            <div className="mt-7 flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">

              <div>

                <p className="text-xs text-slate-400">
                  From
                </p>


                <p className="mt-1 font-bold text-slate-900">
                  {sourceCurrency || "—"}
                </p>


                <p className="mt-1 text-xs text-slate-500">
                  {senderCountryName || "Unknown country"}
                </p>

              </div>


              <div className="flex items-center gap-3">

                <div className="h-px w-8 bg-slate-200" />

                <span className="text-slate-400">
                  →
                </span>

                <div className="h-px w-8 bg-slate-200" />

              </div>


              <div className="text-right">

                <p className="text-xs text-slate-400">
                  To
                </p>


                <p className="mt-1 font-bold text-slate-900">
                  {destinationCurrency || "—"}
                </p>


                <p className="mt-1 text-xs text-slate-500">
                  {beneficiaryCountryName || "Unknown country"}
                </p>

              </div>

            </div>


            {!corridorIsValid && (

              <div className="mt-5 rounded-xl bg-red-50 p-4">

                <p className="text-sm font-semibold text-red-800">
                  Transfer corridor missing
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  Return to the home page and
                  choose the sending and receiving
                  countries again.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/")
                  }
                  className="mt-3 text-sm font-semibold text-red-800 underline"
                >
                  Choose countries
                </button>

              </div>

            )}


            {/* QUOTE FORM */}

            <form
              onSubmit={
                handleQuote
              }
              className="mt-7"
            >

              <label className="text-sm font-semibold text-slate-700">
                You send
              </label>


              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-5 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    amount
                  }
                  onChange={(event) => {

                    setAmount(
                      event.target.value
                    );


                    setQuote(null);

                    setError("");
                  }}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent py-5 text-3xl font-semibold text-slate-950 outline-none"
                />


                <div className="ml-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                  {sourceCurrency || "—"}
                </div>

              </div>


              {/* ERROR */}

              {error && (

                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">

                  {error}

                </div>

              )}


              {/* GET QUOTE */}

              <button
                type="submit"
                disabled={
                  loading ||
                  !corridorIsValid
                }
                className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >

                {loading
                  ? "Getting quote..."
                  : "Get quote"}

              </button>

            </form>


            {/* REAL QUOTE */}

            {quote && (

              <div className="mt-7">

                {/* RECIPIENT AMOUNT */}

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Recipient gets
                  </p>


                  <p className="mt-2 text-3xl font-bold text-emerald-950">

                    {formatMoney(
                      quote.recipient_amount,
                      quote.destination_currency
                    )}

                  </p>


                  <p className="mt-1 text-sm text-emerald-700">

                    {
                      quote.destination_currency
                    }

                  </p>

                </div>


                {/* QUOTE DETAILS */}

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">

                  <QuoteRow
                    label="You send"
                    value={
                      formatMoney(
                        quote.source_amount,
                        quote.source_currency
                      )
                    }
                  />


                  <QuoteRow
                    label="Reference rate"
                    value={
                      `1 ${
                        quote.source_currency
                      } = ${
                        quote.fx_rate
                      } ${
                        quote.destination_currency
                      }`
                    }
                  />


                  <QuoteRow
                    label="REMITX fee"
                    value={
                      formatMoney(
                        quote.fee,
                        quote.destination_currency
                      )
                    }
                  />


                  <QuoteRow
                    label="Rate source"
                    value={
                      quote.rate_source
                    }
                  />


                  {quote.rate_date && (

                    <QuoteRow
                      label="Rate date"
                      value={
                        quote.rate_date
                      }
                    />

                  )}

                </div>


                {/* REFERENCE QUOTE NOTICE */}

                <div className="mt-5 rounded-xl bg-amber-50 p-4">

                  <p className="text-sm font-semibold text-amber-900">
                    Reference quote
                  </p>


                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    This rate is provided
                    for the current transfer
                    preview and is not locked
                    yet.
                  </p>

                </div>


                {/* CONTINUE */}

                <button
                  type="button"
                  onClick={
                    continueToRecipient
                  }
                  className="mt-6 w-full rounded-xl bg-slate-950 py-4 font-semibold text-white transition hover:bg-slate-800"
                >
                  Continue →
                </button>


                <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                  No payment has been
                  submitted yet.
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  );
}


// -------------------------------------------------
// LOGO
// -------------------------------------------------

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


// -------------------------------------------------
// QUOTE ROW
// -------------------------------------------------

function QuoteRow({
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


      <span className="text-right font-semibold text-slate-800">
        {value}
      </span>

    </div>
  );
}


// -------------------------------------------------
// PROGRESS STEPS
// -------------------------------------------------

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

          const stepNumber =
            index + 1;


          const active =
            stepNumber ===
            activeStep;


          const completed =
            stepNumber <
            activeStep;


          return (

            <div
              key={
                step
              }
              className="contents"
            >

              <div className="flex items-center gap-2">

                <div
                  className={
                    active
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                      : completed
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                        : "flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500"
                  }
                >

                  {completed
                    ? "✓"
                    : stepNumber}

                </div>


                <span
                  className={
                    active
                      ? "font-semibold text-blue-700"
                      : completed
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