"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  getTransaction,
  type TransactionRecord,
} from "@/lib/api";

import {
  clearTransferDraft,
} from "@/lib/transferDraft";


export default function TransferPage() {

  const router =
    useRouter();


  const params =
    useParams();


  const transactionId =
    String(
      params.transactionId ??
        ""
    );


  const [
    transaction,
    setTransaction,
  ] =
    useState<TransactionRecord | null>(
      null
    );


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState("");


  const loadTransaction =
    useCallback(
      async (
        showLoading = false
      ) => {

        if (!transactionId) {
          return;
        }


        if (showLoading) {
          setLoading(true);
        }


        try {

          const result =
            await getTransaction(
              transactionId
            );


          setTransaction(
            result
          );

          setError("");

        } catch (
          requestError
        ) {

          if (
            requestError
            instanceof Error
          ) {

            setError(
              requestError.message
            );

          } else {

            setError(
              "Unable to load the transfer."
            );

          }

        } finally {

          setLoading(false);

        }
      },
      [transactionId]
    );


  useEffect(() => {

    loadTransaction(true);

  }, [loadTransaction]);


  useEffect(() => {

    if (!transactionId) {
      return;
    }


    const intervalId =
      window.setInterval(
        () => {
          loadTransaction(false);
        },
        3000
      );


    return () => {
      window.clearInterval(
        intervalId
      );
    };

  }, [
    transactionId,
    loadTransaction,
  ]);


  useEffect(() => {

    if (!transaction) {
      return;
    }


    clearTransferDraft();

  }, [transaction]);


  if (loading) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        Loading your transfer...
      </div>
    );
  }


  if (
    error ||
    !transaction
  ) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">

        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">

          <h1 className="text-2xl font-bold">
            We couldn&apos;t load this transfer
          </h1>


          <p className="mt-3 text-sm text-slate-500">
            {error}
          </p>


          <button
            type="button"
            onClick={() =>
              loadTransaction(true)
            }
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white"
          >
            Try again
          </button>


          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="mt-3 text-sm font-semibold text-slate-500"
          >
            Return home
          </button>

        </div>

      </main>
    );
  }


  const customerState =
    getCustomerState(
      transaction.status
    );


  return (

    <main className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          <Logo />


          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="text-sm font-semibold text-slate-600"
          >
            Done
          </button>

        </div>

      </header>


      <div className="mx-auto max-w-5xl px-6 py-12">

        <ProgressSteps />


        <div className="mx-auto mt-10 max-w-2xl">

          {/* STATUS */}

          <div
            className={
              `${customerState.background} rounded-3xl border p-7`
            }
          >

            <div className="flex items-start gap-4">

              <div
                className={
                  `${customerState.iconBackground} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl`
                }
              >
                {customerState.icon}
              </div>


              <div>

                <p
                  className={
                    `text-sm font-semibold ${customerState.labelColor}`
                  }
                >
                  TRANSFER STATUS
                </p>


                <h1 className="mt-1 text-3xl font-bold text-slate-950">
                  {customerState.title}
                </h1>


                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {customerState.description}
                </p>

              </div>

            </div>

          </div>


          {/* AMOUNT */}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/40">

            <div className="grid gap-6 sm:grid-cols-2">

              <Amount
                label="You sent"
                value={
                  transaction.source_amount
                }
                currency={
                  transaction.source_currency
                }
              />


              <Amount
                label="Recipient amount"
                value={
                  transaction.destination_amount
                }
                currency={
                  transaction.destination_currency
                }
                right
              />

            </div>


            <div className="mt-7 border-t border-slate-100 pt-6">

              <div className="space-y-4">

                <Row
                  label="Exchange rate"
                  value={
                    `1 ${transaction.source_currency} = ${transaction.fx_rate} ${transaction.destination_currency}`
                  }
                />


                <Row
                  label="Fee"
                  value={
                    `${transaction.fee} ${transaction.destination_currency}`
                  }
                />


                <Row
                  label="Transfer reference"
                  value={
                    shortReference(
                      transaction.transaction_id
                    )
                  }
                />

              </div>

            </div>

          </div>


          {/* TRACKER */}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7">

            <h2 className="text-xl font-bold text-slate-950">
              Transfer progress
            </h2>


            <div className="mt-7">

              <TimelineItem
                title="Transfer created"
                description="We received your transfer request."
                complete
              />


              <TimelineItem
                title="Checks completed"
                description={
                  getCheckMessage(
                    transaction.status
                  )
                }
                complete={
                  transaction.status !==
                  "BLOCKED"
                }
                warning={
                  transaction.status ===
                  "REVIEW_REQUIRED"
                }
                failed={
                  transaction.status ===
                  "BLOCKED"
                }
              />


              <TimelineItem
                title="Settlement submitted"
                description={
                  getSettlementMessage(
                    transaction.status
                  )
                }
                complete={
                  hasReachedSettlement(
                    transaction.status
                  )
                }
                warning={
                  transaction.status ===
                  "DRUNIX_SUBMISSION_FAILED"
                }
              />


              <TimelineItem
                title="Settlement processing"
                description={
                  getProcessingMessage(
                    transaction.status
                  )
                }
                complete={
                  hasReachedProcessing(
                    transaction.status
                  )
                }
              />


              <TimelineItem
                title="Funds settled"
                description={
                  getFundsSettledMessage(
                    transaction.status
                  )
                }
                complete={
                  hasReachedSettled(
                    transaction.status
                  )
                }
              />


              <TimelineItem
                title="Recipient payout"
                description={
                  getPayoutMessage(
                    transaction.status
                  )
                }
                complete={
                  transaction.status ===
                  "PAYOUT_COMPLETED"
                }
                failed={
                  transaction.status ===
                  "SETTLEMENT_FAILED"
                }
                last
              />

            </div>

          </div>


          {/* CUSTOMER ACTION */}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() =>
                loadTransaction(
                  true
                )
              }
              className="rounded-xl border border-slate-300 bg-white py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Refresh status
            </button>


            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
              className="rounded-xl bg-slate-950 py-3.5 font-semibold text-white transition hover:bg-slate-800"
            >
              Send another transfer
            </button>

          </div>


          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Reference{" "}
            {transaction.transaction_id}
          </p>

        </div>

      </div>

    </main>
  );
}


// -------------------------------------------------
// CUSTOMER STATUS
// -------------------------------------------------

function getCustomerState(
  status: string
) {

  switch (status) {

    case "DRUNIX_COMMITTED":

      return {
        title:
          "Transfer submitted",

        description:
          "Your transfer has passed the initial checks and its settlement record has been committed.",

        icon: "✓",

        background:
          "border-emerald-100 bg-emerald-50",

        iconBackground:
          "bg-emerald-600 text-white",

        labelColor:
          "text-emerald-700",
      };


    case "SETTLEMENT_PROCESSING":

      return {
        title:
          "Transfer in progress",

        description:
          "Your transfer is moving through the settlement process.",

        icon: "…",

        background:
          "border-blue-100 bg-blue-50",

        iconBackground:
          "bg-blue-600 text-white",

        labelColor:
          "text-blue-700",
      };


    case "SETTLED":

      return {
        title:
          "Funds settled",

        description:
          "Settlement is complete and the transfer is ready for payout completion.",

        icon: "✓",

        background:
          "border-emerald-100 bg-emerald-50",

        iconBackground:
          "bg-emerald-600 text-white",

        labelColor:
          "text-emerald-700",
      };


    case "PAYOUT_COMPLETED":

      return {
        title:
          "Transfer completed",

        description:
          "The REMITX settlement lifecycle has completed successfully.",

        icon: "✓",

        background:
          "border-emerald-100 bg-emerald-50",

        iconBackground:
          "bg-emerald-600 text-white",

        labelColor:
          "text-emerald-700",
      };


    case "SETTLEMENT_FAILED":

      return {
        title:
          "Transfer delayed",

        description:
          "Settlement could not be completed. The transfer requires operational attention.",

        icon: "!",

        background:
          "border-red-100 bg-red-50",

        iconBackground:
          "bg-red-600 text-white",

        labelColor:
          "text-red-700",
      };


    case "REVIEW_REQUIRED":

      return {
        title:
          "We’re reviewing your transfer",

        description:
          "Your transfer needs an additional review before settlement can continue.",

        icon: "!",

        background:
          "border-amber-100 bg-amber-50",

        iconBackground:
          "bg-amber-500 text-white",

        labelColor:
          "text-amber-700",
      };


    case "BLOCKED":

      return {
        title:
          "Transfer cannot continue",

        description:
          "This transfer did not pass the required checks and was not submitted for settlement.",

        icon: "×",

        background:
          "border-red-100 bg-red-50",

        iconBackground:
          "bg-red-600 text-white",

        labelColor:
          "text-red-700",
      };


    case "DRUNIX_SUBMISSION_FAILED":

      return {
        title:
          "Transfer delayed",

        description:
          "Your transfer passed the initial checks, but settlement submission could not be completed.",

        icon: "!",

        background:
          "border-amber-100 bg-amber-50",

        iconBackground:
          "bg-amber-500 text-white",

        labelColor:
          "text-amber-700",
      };


    case "RISK_APPROVED":

      return {
        title:
          "Transfer is being processed",

        description:
          "Your transfer passed the initial checks and is preparing for settlement.",

        icon: "…",

        background:
          "border-blue-100 bg-blue-50",

        iconBackground:
          "bg-blue-600 text-white",

        labelColor:
          "text-blue-700",
      };


    default:

      return {
        title:
          "Transfer received",

        description:
          "We received your transfer and are processing it.",

        icon: "…",

        background:
          "border-blue-100 bg-blue-50",

        iconBackground:
          "bg-blue-600 text-white",

        labelColor:
          "text-blue-700",
      };
  }
}


// -------------------------------------------------
// TRACKER MESSAGES
// -------------------------------------------------

function getCheckMessage(
  status: string
) {

  if (
    status ===
    "REVIEW_REQUIRED"
  ) {

    return (
      "Additional review is required before settlement."
    );
  }


  if (
    status ===
    "BLOCKED"
  ) {

    return (
      "The transfer did not pass the required checks."
    );
  }


  return (
    "The transfer passed the initial checks."
  );
}


function getSettlementMessage(
  status: string
) {

  if (hasReachedSettlement(status)) {
    return "Your transfer has been submitted for settlement.";
  }

  if (status === "DRUNIX_SUBMISSION_FAILED") {
    return "Settlement submission is delayed.";
  }

  if (status === "REVIEW_REQUIRED") {
    return "Settlement will begin after review.";
  }

  if (status === "BLOCKED") {
    return "Settlement was not submitted.";
  }

  return "Preparing settlement.";
}


function getProcessingMessage(
  status: string
) {

  if (hasReachedProcessing(status)) {
    return "Your transfer is moving through settlement.";
  }

  return "Settlement processing will begin after submission.";
}


function getFundsSettledMessage(
  status: string
) {

  if (hasReachedSettled(status)) {
    return "The settlement stage has completed.";
  }

  return "Funds settlement is waiting for the previous stage.";
}


function getPayoutMessage(
  status: string
) {

  if (status === "PAYOUT_COMPLETED") {
    return "The transfer lifecycle is complete.";
  }

  if (status === "SETTLEMENT_FAILED") {
    return "Settlement requires operational attention before completion.";
  }

  if (status === "SETTLED") {
    return "Settlement is complete and payout completion is pending.";
  }

  return "Payout completion will appear here as the settlement lifecycle progresses.";
}


function hasReachedSettlement(
  status: string
) {

  return [
    "DRUNIX_COMMITTED",
    "SETTLEMENT_PROCESSING",
    "SETTLED",
    "PAYOUT_COMPLETED",
  ].includes(status);
}


function hasReachedProcessing(
  status: string
) {

  return [
    "SETTLEMENT_PROCESSING",
    "SETTLED",
    "PAYOUT_COMPLETED",
  ].includes(status);
}


function hasReachedSettled(
  status: string
) {

  return [
    "SETTLED",
    "PAYOUT_COMPLETED",
  ].includes(status);
}


// -------------------------------------------------
// UI
// -------------------------------------------------

function Logo() {

  return (

    <div className="flex items-center gap-3">

      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
        RX
      </div>


      <p className="font-bold">
        REMIT
        <span className="text-blue-600">
          X
        </span>
      </p>

    </div>
  );
}


function Amount({
  label,
  value,
  currency,
  right = false,
}: {
  label: string;
  value: number;
  currency: string;
  right?: boolean;
}) {

  return (

    <div
      className={
        right
          ? "sm:text-right"
          : ""
      }
    >

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>


      <p className="mt-2 text-2xl font-bold">
        {value}{" "}
        {currency}
      </p>

    </div>
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

    <div className="flex items-start justify-between gap-5 text-sm">

      <span className="text-slate-500">
        {label}
      </span>


      <span className="max-w-xs text-right font-semibold text-slate-900">
        {value}
      </span>

    </div>
  );
}


function TimelineItem({
  title,
  description,
  complete = false,
  warning = false,
  failed = false,
  last = false,
}: {
  title: string;
  description: string;
  complete?: boolean;
  warning?: boolean;
  failed?: boolean;
  last?: boolean;
}) {

  let circleClass =
    "border-2 border-slate-200 bg-white text-slate-300";


  let symbol = "";


  if (complete) {

    circleClass =
      "border-emerald-600 bg-emerald-600 text-white";

    symbol = "✓";

  }


  if (warning) {

    circleClass =
      "border-amber-500 bg-amber-500 text-white";

    symbol = "!";

  }


  if (failed) {

    circleClass =
      "border-red-600 bg-red-600 text-white";

    symbol = "×";

  }


  return (

    <div className="flex gap-4">

      <div className="flex flex-col items-center">

        <div
          className={
            `flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${circleClass}`
          }
        >
          {symbol}
        </div>


        {!last && (

          <div className="min-h-14 w-px flex-1 bg-slate-200" />

        )}

      </div>


      <div
        className={
          last
            ? ""
            : "pb-7"
        }
      >

        <p className="font-semibold text-slate-900">
          {title}
        </p>


        <p className="mt-1 text-sm leading-5 text-slate-500">
          {description}
        </p>

      </div>

    </div>
  );
}


function ProgressSteps() {

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
            number === 4;


          const complete =
            number < 4;


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


function shortReference(
  transactionId: string
) {

  if (
    transactionId.length <=
    12
  ) {

    return transactionId;

  }


  return (
    `${transactionId.slice(0, 8)}...${transactionId.slice(-4)}`
  );
}
