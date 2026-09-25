"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getTransferDraft,
  updateTransferDraft,
  type PayoutMethod,
  type TransferDraft,
} from "@/lib/transferDraft";


export default function RecipientPage() {

  const router =
    useRouter();


  const [draft, setDraft] =
    useState<TransferDraft | null>(
      null
    );


  const [loading, setLoading] =
    useState(true);


  const [fullName, setFullName] =
    useState("");


  const [
    payoutMethod,
    setPayoutMethod,
  ] = useState<PayoutMethod>(
    "BANK"
  );


  const [bankName, setBankName] =
    useState("");


  const [
    accountNumber,
    setAccountNumber,
  ] = useState("");


  const [
    confirmAccountNumber,
    setConfirmAccountNumber,
  ] = useState("");


  const [ifsc, setIfsc] =
    useState("");


  const [upiId, setUpiId] =
    useState("");


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

    setFullName(
      stored.recipientName ?? ""
    );

    setPayoutMethod(
      stored.payoutMethod ??
        "BANK"
    );

    setBankName(
      stored.bankName ?? ""
    );

    setAccountNumber(
      stored.accountNumber ?? ""
    );

    setConfirmAccountNumber(
      stored.accountNumber ?? ""
    );

    setIfsc(
      stored.ifsc ?? ""
    );

    setUpiId(
      stored.upiId ?? ""
    );

    setLoading(false);

  }, [router]);


  if (loading || !draft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        Loading transfer...
      </div>
    );
  }


  const isIndia =
    draft.destinationCurrency ===
    "INR";


  function handleSubmit(
    event: FormEvent
  ) {

    event.preventDefault();

    setError("");


    if (!fullName.trim()) {

      setError(
        "Enter the recipient's full name."
      );

      return;
    }


    if (
      payoutMethod === "BANK"
    ) {

      if (!bankName.trim()) {

        setError(
          "Enter the recipient's bank name."
        );

        return;
      }


      if (!accountNumber.trim()) {

        setError(
          "Enter the recipient's account number."
        );

        return;
      }


      if (
        accountNumber !==
        confirmAccountNumber
      ) {

        setError(
          "The account numbers do not match."
        );

        return;
      }


      if (
        isIndia &&
        !ifsc.trim()
      ) {

        setError(
          "Enter the recipient bank IFSC code."
        );

        return;
      }
    }


    if (
      payoutMethod === "UPI"
    ) {

      if (!upiId.trim()) {

        setError(
          "Enter the recipient's UPI ID."
        );

        return;
      }


      if (
        !upiId.includes("@")
      ) {

        setError(
          "Enter a valid UPI ID."
        );

        return;
      }
    }


    updateTransferDraft({
      recipientName:
        fullName.trim(),

      payoutMethod,

      bankName:
        payoutMethod === "BANK"
          ? bankName.trim()
          : undefined,

      accountNumber:
        payoutMethod === "BANK"
          ? accountNumber.trim()
          : undefined,

      ifsc:
        payoutMethod === "BANK" &&
        isIndia
          ? ifsc
              .trim()
              .toUpperCase()
          : undefined,

      upiId:
        payoutMethod === "UPI"
          ? upiId.trim()
          : undefined,
    });


    router.push(
      "/review"
    );
  }


  return (
    <main className="min-h-screen bg-slate-50">

      <Header
        onBack={() =>
          router.back()
        }
      />


      <div className="mx-auto max-w-5xl px-6 py-12">

        <ProgressSteps
          activeStep={2}
        />


        <div className="mx-auto mt-10 max-w-xl">

          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">

            <p className="text-sm font-semibold text-blue-600">
              STEP 2 OF 4
            </p>


            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Who are you sending to?
            </h1>


            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter the recipient details
              required to deliver this
              transfer.
            </p>


            <div className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-5">

              <Summary
                label="You send"
                value={
                  `${draft.sourceAmount} ${draft.sourceCurrency}`
                }
              />


              <Summary
                label="Recipient gets"
                value={
                  `${draft.recipientAmount} ${draft.destinationCurrency}`
                }
                right
              />

            </div>


            <form
              onSubmit={
                handleSubmit
              }
              className="mt-7"
            >

              <Field
                label="Recipient full name"
                value={
                  fullName
                }
                onChange={
                  setFullName
                }
                placeholder="Full legal name"
              />


              <div className="mt-6">

                <p className="text-sm font-semibold text-slate-700">
                  Receive via
                </p>


                <div className="mt-3 grid gap-3 sm:grid-cols-2">

                  <MethodCard
                    title="Bank account"
                    description="Deposit to recipient bank"
                    selected={
                      payoutMethod ===
                      "BANK"
                    }
                    onClick={() =>
                      setPayoutMethod(
                        "BANK"
                      )
                    }
                  />


                  {isIndia && (

                    <MethodCard
                      title="UPI"
                      description="Send using a UPI ID"
                      selected={
                        payoutMethod ===
                        "UPI"
                      }
                      onClick={() =>
                        setPayoutMethod(
                          "UPI"
                        )
                      }
                    />

                  )}

                </div>

              </div>


              {payoutMethod ===
                "BANK" && (

                <div className="mt-7 space-y-5 border-t border-slate-100 pt-7">

                  <Field
                    label="Bank name"
                    value={
                      bankName
                    }
                    onChange={
                      setBankName
                    }
                    placeholder="Recipient bank"
                  />


                  <Field
                    label="Account number"
                    value={
                      accountNumber
                    }
                    onChange={
                      setAccountNumber
                    }
                    placeholder="Account number"
                    type="password"
                  />


                  <Field
                    label="Confirm account number"
                    value={
                      confirmAccountNumber
                    }
                    onChange={
                      setConfirmAccountNumber
                    }
                    placeholder="Re-enter account number"
                  />


                  {isIndia && (

                    <Field
                      label="IFSC code"
                      value={
                        ifsc
                      }
                      onChange={
                        setIfsc
                      }
                      placeholder="Example: HDFC0001234"
                    />

                  )}

                </div>

              )}


              {payoutMethod ===
                "UPI" && (

                <div className="mt-7 border-t border-slate-100 pt-7">

                  <Field
                    label="UPI ID"
                    value={
                      upiId
                    }
                    onChange={
                      setUpiId
                    }
                    placeholder="name@bank"
                  />

                </div>

              )}


              {error && (

                <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>

              )}


              <div className="mt-6 rounded-xl bg-blue-50 p-4">

                <p className="text-sm font-semibold text-blue-900">
                  Your recipient&apos;s
                  sensitive details stay
                  outside the shared
                  settlement ledger.
                </p>

              </div>


              <button
                type="submit"
                className="mt-7 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700"
              >
                Review transfer →
              </button>

            </form>

          </div>

        </div>

      </div>

    </main>
  );
}


function Header({
  onBack,
}: {
  onBack: () => void;
}) {

  return (
    <header className="border-b border-slate-200 bg-white">

      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

        <button
          onClick={
            onBack
          }
          className="text-sm font-semibold text-slate-600"
        >
          ← Back
        </button>


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


        <div className="w-12" />

      </div>

    </header>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder: string;
  type?: string;
}) {

  return (
    <div>

      <label className="text-sm font-semibold text-slate-700">
        {label}
      </label>


      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />

    </div>
  );
}


function MethodCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={
        selected
          ? "rounded-xl border-2 border-blue-600 bg-blue-50 p-4 text-left"
          : "rounded-xl border border-slate-200 bg-white p-4 text-left"
      }
    >

      <div className="flex items-center justify-between gap-3">

        <p className="font-semibold">
          {title}
        </p>


        <div
          className={
            selected
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white"
              : "h-5 w-5 rounded-full border border-slate-300"
          }
        >
          {selected
            ? "✓"
            : ""}
        </div>

      </div>


      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

    </button>
  );
}


function Summary({
  label,
  value,
  right = false,
}: {
  label: string;
  value: string;
  right?: boolean;
}) {

  return (
    <div
      className={
        right
          ? "text-right"
          : ""
      }
    >

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
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
        (step, index) => {

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