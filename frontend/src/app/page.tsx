"use client";

import { useRouter } from "next/navigation";

import CustomerLanding from "@/components/CustomerLanding";


export default function Home() {

  const router = useRouter();


  function handleSendMoney(
    senderCountry: string,
    sourceCurrency: string,
    beneficiaryCountry: string,
    destinationCurrency: string
  ) {

    const params =
      new URLSearchParams({
        senderCountry,
        from: sourceCurrency,
        beneficiaryCountry,
        to: destinationCurrency,
      });


    router.push(
      `/send?${params.toString()}`
    );
  }


  return (
    <CustomerLanding
      onSendMoney={
        handleSendMoney
      }
    />
  );
}