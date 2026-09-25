"use client";

import {
  useMemo,
  useState,
} from "react";


type CustomerLandingProps = {
  onSendMoney: (
    senderCountry: string,
    sourceCurrency: string,
    beneficiaryCountry: string,
    destinationCurrency: string
  ) => void;
};


type CurrencyOption = {
  countryCode: string;
  country: string;
  currency: string;
  flag: string;
};


const CURRENCIES: CurrencyOption[] = [
  {
    countryCode: "AE",
    country: "United Arab Emirates",
    currency: "AED",
    flag: "🇦🇪",
  },
  {
    countryCode: "IN",
    country: "India",
    currency: "INR",
    flag: "🇮🇳",
  },
  {
    countryCode: "US",
    country: "United States",
    currency: "USD",
    flag: "🇺🇸",
  },
  {
    countryCode: "GB",
    country: "United Kingdom",
    currency: "GBP",
    flag: "🇬🇧",
  },
  {
    countryCode: "DE",
    country: "Germany",
    currency: "EUR",
    flag: "🇩🇪",
  },
];


export default function CustomerLanding({
  onSendMoney,
}: CustomerLandingProps) {

  const [
    sourceCountry,
    setSourceCountry,
  ] = useState("AE");


  const [
    destinationCountry,
    setDestinationCountry,
  ] = useState("IN");


  const source = useMemo(
    () =>
      CURRENCIES.find(
        (item) =>
          item.countryCode ===
          sourceCountry
      ) ?? CURRENCIES[0],
    [sourceCountry]
  );


  const destination = useMemo(
    () =>
      CURRENCIES.find(
        (item) =>
          item.countryCode ===
          destinationCountry
      ) ?? CURRENCIES[1],
    [destinationCountry]
  );


  function handleSwap() {

    const oldSource =
      sourceCountry;


    setSourceCountry(
      destinationCountry
    );


    setDestinationCountry(
      oldSource
    );
  }


  function continueToSend() {

    if (
      source.countryCode ===
      destination.countryCode
    ) {
      return;
    }


    onSendMoney(
      source.countryCode,
      source.currency,
      destination.countryCode,
      destination.currency
    );
  }


  const sameCountry =
    source.countryCode ===
    destination.countryCode;


  return (
    <main className="min-h-screen bg-white text-slate-950">

      {/* NAVIGATION */}

      <nav className="border-b border-slate-100 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              RX
            </div>

            <div>

              <p className="text-xl font-bold tracking-tight">
                REMIT
                <span className="text-blue-600">
                  X
                </span>
              </p>

              <p className="text-[11px] text-slate-500">
                Cross-Border Payments
              </p>

            </div>

          </div>


          <button
            onClick={
              continueToSend
            }
            disabled={
              sameCountry
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Send money
          </button>

        </div>

      </nav>


      {/* HERO */}

      <section className="relative overflow-hidden">

        <div className="absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl" />


        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">

          {/* LEFT */}

          <div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">

              <span>
                {source.flag}
              </span>

              <span>
                {source.country}
              </span>

              <span>
                →
              </span>

              <span>
                {destination.flag}
              </span>

              <span>
                {destination.country}
              </span>

            </div>


            <h1 className="max-w-2xl text-5xl font-bold leading-[1.08] tracking-tight lg:text-6xl">

              Send money.

              <br />

              Know where it is.

              <br />

              <span className="text-blue-600">
                Every step of the way.
              </span>

            </h1>


            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Transparent cross-border payments
              with upfront pricing, transfer
              tracking and verifiable settlement.
            </p>


            <button
              onClick={
                continueToSend
              }
              disabled={
                sameCountry
              }
              className="mt-9 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Send money →
            </button>


            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">

              <span>
                ✓ Upfront pricing
              </span>

              <span>
                ✓ Transfer tracking
              </span>

              <span>
                ✓ Settlement verification
              </span>

            </div>

          </div>


          {/* TRANSFER SELECTOR */}

          <div className="mx-auto w-full max-w-md">

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-200/70">

              <div>

                <p className="text-lg font-semibold">
                  Where are you sending money?
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Choose the countries for your
                  transfer.
                </p>

              </div>


              {/* SOURCE */}

              <div className="mt-7">

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  You send from
                </label>


                <select
                  value={
                    sourceCountry
                  }
                  onChange={(event) =>
                    setSourceCountry(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold outline-none transition focus:border-blue-500"
                >

                  {CURRENCIES.map(
                    (item) => (

                      <option
                        key={
                          item.countryCode
                        }
                        value={
                          item.countryCode
                        }
                      >
                        {item.flag}{" "}
                        {item.country} —{" "}
                        {item.currency}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* SWAP */}

              <div className="my-4 flex justify-center">

                <button
                  type="button"
                  onClick={
                    handleSwap
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                >
                  ⇅
                </button>

              </div>


              {/* DESTINATION */}

              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recipient receives in
                </label>


                <select
                  value={
                    destinationCountry
                  }
                  onChange={(event) =>
                    setDestinationCountry(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 font-semibold text-blue-950 outline-none transition focus:border-blue-500"
                >

                  {CURRENCIES.map(
                    (item) => (

                      <option
                        key={
                          item.countryCode
                        }
                        value={
                          item.countryCode
                        }
                      >
                        {item.flag}{" "}
                        {item.country} —{" "}
                        {item.currency}
                      </option>

                    )
                  )}

                </select>

              </div>


              {sameCountry && (

                <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  Please choose two different
                  countries.
                </div>

              )}


              {!sameCountry && (

                <div className="mt-5 rounded-xl bg-blue-50 p-4">

                  <p className="text-sm font-semibold text-blue-900">
                    {source.flag}{" "}
                    {source.currency}
                    {" → "}
                    {destination.flag}{" "}
                    {destination.currency}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    {source.country}
                    {" → "}
                    {destination.country}
                  </p>

                </div>

              )}


              <button
                onClick={
                  continueToSend
                }
                disabled={
                  sameCountry
                }
                className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Get a quote →
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* BENEFITS */}

      <section className="border-y border-slate-100 bg-slate-50">

        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3 lg:px-8">

          <BenefitCard
            number="01"
            title="Know the cost"
            description="See the exchange rate, fee and recipient amount before confirming."
          />

          <BenefitCard
            number="02"
            title="Track the transfer"
            description="Follow the payment from confirmation through settlement and payout."
          />

          <BenefitCard
            number="03"
            title="Verify settlement"
            description="Eligible completed transfers include an auditable settlement record."
          />

        </div>

      </section>


      {/* TRUST */}

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

        <div className="rounded-3xl bg-slate-950 px-7 py-12 text-white lg:px-12">

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

            <div>

              <p className="text-sm font-semibold text-blue-400">
                BUILT FOR TRANSPARENCY
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Cross-border payments
                shouldn&apos;t feel like
                a black box.
              </h2>

              <p className="mt-5 max-w-xl leading-7 text-slate-400">
                REMITX connects payment
                processing, risk controls,
                routing and settlement into
                one trackable journey.
              </p>

            </div>


            <div className="grid gap-3">

              <TrustRow
                text="Pricing visible before confirmation"
              />

              <TrustRow
                text="Payment status visible throughout the journey"
              />

              <TrustRow
                text="Risk controls before settlement"
              />

              <TrustRow
                text="Auditable settlement records for verification"
              />

            </div>

          </div>

        </div>

      </section>


      <footer className="border-t border-slate-100">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <p>
            REMITX — Programmable
            Cross-Border Payment Network
          </p>

          <p>
            Prototype environment
          </p>

        </div>

      </footer>

    </main>
  );
}


function BenefitCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7">

      <p className="text-sm font-bold text-blue-600">
        {number}
      </p>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </div>
  );
}


function TrustRow({
  text,
}: {
  text: string;
}) {

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">

      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        ✓
      </div>

      <span className="text-sm text-slate-300">
        {text}
      </span>

    </div>
  );
}