"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createPayment,
  getPaymentStats,
  getSettlementProof,
  getTransactions,
  updateSettlementStatus,
  PaymentResponse,
  PaymentStats,
  SettlementLifecycleStatus,
  SettlementProof,
  TransactionRecord,
} from "@/lib/api";

type NavigationItem = "Dashboard" | "Send Payment" | "Transactions" | "Settlement Proof";

export default function OperationsPage() {
  const [activePage, setActivePage] = useState<NavigationItem>("Dashboard");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [proof, setProof] = useState<SettlementProof | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingProof, setIsLoadingProof] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [amount, setAmount] = useState("1000");
  const [sourceCurrency, setSourceCurrency] = useState("AED");
  const [destinationCurrency, setDestinationCurrency] = useState("INR");
  const [senderCountry, setSenderCountry] = useState("AE");
  const [beneficiaryCountry, setBeneficiaryCountry] = useState("IN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [transactionData, statisticsData] = await Promise.all([
        getTransactions(50),
        getPaymentStats(),
      ]);
      setTransactions(transactionData.transactions);
      setStats(statisticsData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load operations data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function handleSettlementAction(transaction: TransactionRecord) {
    const next = getNextSettlementAction(transaction);
    if (!next) return;

    setError(null);
    setSuccess(null);
    setUpdatingId(transaction.transaction_id);

    try {
      const result = await updateSettlementStatus(transaction.transaction_id, next.status);
      setSuccess(`${shortId(transaction.transaction_id)} advanced from ${result.previous_status} to ${result.status}.`);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update settlement status.");
      await loadDashboardData();
    } finally {
      setUpdatingId(null);
    }
  }

  async function loadProof(transactionId: string) {
    setError(null);
    setSuccess(null);
    setIsLoadingProof(true);
    try {
      const result = await getSettlementProof(transactionId);
      setProof(result);
      setActivePage("Settlement Proof");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load settlement proof.");
    } finally {
      setIsLoadingProof(false);
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const result = await createPayment({
        sender_country: senderCountry,
        beneficiary_country: beneficiaryCountry,
        source_currency: sourceCurrency,
        destination_currency: destinationCurrency,
        amount: numericAmount,
      });
      setPaymentResult(result);
      await loadDashboardData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewPayment() {
    setError(null);
    setSuccess(null);
    setPaymentResult(null);
    setProof(null);
    setActivePage("Send Payment");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col bg-slate-950 text-white lg:flex">
          <div className="border-b border-slate-800 px-7 py-7">
            <div className="text-2xl font-bold tracking-tight">REMIT<span className="text-blue-500">X</span></div>
            <p className="mt-1 text-xs text-slate-400">Settlement Network</p>
          </div>
          <nav className="flex-1 space-y-2 px-4 py-6">
            {(["Dashboard", "Send Payment", "Transactions", "Settlement Proof"] as NavigationItem[]).map((item) => (
              <button key={item} onClick={() => item === "Send Payment" ? startNewPayment() : setActivePage(item)} className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${activePage === item ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
                {item}
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-800 p-5">
            <div className="rounded-xl bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Settlement Network</p>
              <div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/><span className="text-sm">Drunix</span></div>
              <p className="mt-1 text-xs text-slate-500">remitxchannel</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5 lg:px-10">
            <div className="flex items-center justify-between">
              <div><h1 className="text-xl font-semibold text-slate-900">{activePage}</h1><p className="mt-1 text-sm text-slate-500">Cross-border payment and settlement operations</p></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">RX</div>
            </div>
          </header>

          <div className="p-6 lg:p-10">
            {error && <Banner kind="error" message={error} onClose={() => setError(null)} />}
            {success && <Banner kind="success" message={success} onClose={() => setSuccess(null)} />}

            {activePage === "Dashboard" && (
              <Dashboard stats={stats} transactions={transactions} isLoading={isLoadingData} updatingId={updatingId} onRefresh={loadDashboardData} onSendPayment={startNewPayment} onViewProof={loadProof} onAdvance={handleSettlementAction} />
            )}

            {activePage === "Transactions" && (
              <TransactionsView transactions={transactions} isLoading={isLoadingData} updatingId={updatingId} onRefresh={loadDashboardData} onViewProof={loadProof} onAdvance={handleSettlementAction} />
            )}

            {activePage === "Send Payment" && (
              <SendPaymentView amount={amount} setAmount={setAmount} sourceCurrency={sourceCurrency} setSourceCurrency={setSourceCurrency} destinationCurrency={destinationCurrency} setDestinationCurrency={setDestinationCurrency} senderCountry={senderCountry} setSenderCountry={setSenderCountry} beneficiaryCountry={beneficiaryCountry} setBeneficiaryCountry={setBeneficiaryCountry} onSubmit={handlePaymentSubmit} isSubmitting={isSubmitting} result={paymentResult} onNew={startNewPayment} onProof={loadProof} />
            )}

            {activePage === "Settlement Proof" && <ProofView proof={proof} isLoading={isLoadingProof} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Dashboard({ stats, transactions, isLoading, updatingId, onRefresh, onSendPayment, onViewProof, onAdvance }: { stats: PaymentStats | null; transactions: TransactionRecord[]; isLoading: boolean; updatingId: string | null; onRefresh: () => void; onSendPayment: () => void; onViewProof: (id: string) => void; onAdvance: (t: TransactionRecord) => void; }) {
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-bold text-slate-900">Payment Operations</h2><p className="mt-2 text-sm text-slate-500">Live operational data from REMITX, PostgreSQL and Drunix.</p></div><div className="flex gap-3"><button onClick={onRefresh} disabled={isLoading} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">{isLoading ? "Refreshing..." : "Refresh"}</button><button onClick={onSendPayment} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white">+ New Payment</button></div></div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric title="Total Transactions" value={isLoading ? "..." : String(stats?.total_transactions ?? 0)} text="Stored in PostgreSQL"/><Metric title="Drunix Committed" value={isLoading ? "..." : String(stats?.drunix_committed ?? 0)} text="Ledger submissions"/><Metric title="Under Review" value={isLoading ? "..." : String(stats?.review_required ?? 0)} text="Manual review queue"/><Metric title="Blocked" value={isLoading ? "..." : String(stats?.blocked ?? 0)} text="Blocked by risk controls"/></div>
    <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-200 p-6"><h3 className="font-semibold text-slate-900">Recent Transactions</h3><p className="mt-1 text-sm text-slate-500">Advance eligible settlements without leaving the Operations Console.</p></div><TransactionTable transactions={transactions.slice(0, 5)} isLoading={isLoading} updatingId={updatingId} onViewProof={onViewProof} onAdvance={onAdvance}/></div>
  </div>;
}

function TransactionsView({ transactions, isLoading, updatingId, onRefresh, onViewProof, onAdvance }: { transactions: TransactionRecord[]; isLoading: boolean; updatingId: string | null; onRefresh: () => void; onViewProof: (id: string) => void; onAdvance: (t: TransactionRecord) => void; }) {
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Transaction History</h2><p className="mt-2 text-sm text-slate-500">Operational settlement controls backed by the FastAPI lifecycle endpoint.</p></div><button onClick={onRefresh} disabled={isLoading} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">Refresh</button></div><div className="rounded-2xl border border-slate-200 bg-white"><TransactionTable transactions={transactions} isLoading={isLoading} updatingId={updatingId} onViewProof={onViewProof} onAdvance={onAdvance}/></div></div>;
}

function TransactionTable({ transactions, isLoading, updatingId, onViewProof, onAdvance }: { transactions: TransactionRecord[]; isLoading: boolean; updatingId: string | null; onViewProof: (id: string) => void; onAdvance: (t: TransactionRecord) => void; }) {
  if (isLoading) return <div className="p-10 text-center text-sm text-slate-500">Loading transactions...</div>;
  if (!transactions.length) return <div className="p-10 text-center text-sm text-slate-500">No transactions found.</div>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Transaction</th><th className="px-5 py-4">Corridor</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Risk</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Settlement Action</th><th className="px-5 py-4">Proof</th></tr></thead><tbody>{transactions.map((t) => { const action = getNextSettlementAction(t); const busy = updatingId === t.transaction_id; return <tr key={t.transaction_id} className="border-t border-slate-100 align-top"><td className="px-5 py-5"><p className="max-w-40 truncate font-mono text-xs text-slate-700" title={t.transaction_id}>{t.transaction_id}</p><p className="mt-1 text-xs text-slate-400">{formatDate(t.created_at)}</p></td><td className="px-5 py-5 font-medium text-slate-700">{t.sender_country} → {t.beneficiary_country}</td><td className="px-5 py-5"><p className="font-medium text-slate-800">{formatNumber(t.source_amount)} {t.source_currency}</p><p className="mt-1 text-xs text-slate-400">→ {formatNumber(t.destination_amount)} {t.destination_currency}</p></td><td className="px-5 py-5"><p className="font-medium text-slate-700">{t.risk_level || "—"}</p><p className="mt-1 text-xs text-slate-400">Score: {t.risk_score ?? "—"}</p></td><td className="px-5 py-5"><StatusBadge value={t.status}/>{t.drunix_status && t.drunix_status !== t.status && <p className="mt-2 text-xs text-amber-600">Drunix: {t.drunix_status}</p>}</td><td className="px-5 py-5">{action ? <button onClick={() => onAdvance(t)} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Updating..." : action.label}</button> : t.status === "PAYOUT_COMPLETED" || t.drunix_status === "PAYOUT_COMPLETED" ? <span className="text-xs font-semibold text-emerald-700">✓ Lifecycle complete</span> : <span className="text-xs text-slate-400">No action</span>}</td><td className="px-5 py-5">{canShowProof(t) ? <button onClick={() => onViewProof(t.transaction_id)} className="font-semibold text-blue-600 hover:text-blue-800">Verify</button> : <span className="text-xs text-slate-400">Not available</span>}</td></tr>; })}</tbody></table></div>;
}

function SendPaymentView(props: { amount: string; setAmount: (v:string)=>void; sourceCurrency:string; setSourceCurrency:(v:string)=>void; destinationCurrency:string; setDestinationCurrency:(v:string)=>void; senderCountry:string; setSenderCountry:(v:string)=>void; beneficiaryCountry:string; setBeneficiaryCountry:(v:string)=>void; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; isSubmitting:boolean; result:PaymentResponse|null; onNew:()=>void; onProof:(id:string)=>void; }) {
  if (props.result) return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7"><StatusBadge value={props.result.status}/><h2 className="mt-4 text-2xl font-bold text-slate-900">Payment processed</h2><p className="mt-2 break-all font-mono text-xs text-slate-500">{props.result.transaction_id}</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Info label="Source" value={`${formatNumber(props.result.source_amount)} ${props.result.source_currency}`}/><Info label="Destination" value={`${formatNumber(props.result.final_amount)} ${props.result.destination_currency}`}/><Info label="Risk" value={`${props.result.risk_level ?? "—"} (${props.result.risk_score ?? "—"})`}/><Info label="Drunix" value={props.result.drunix.settlement?.settlementStatus ?? props.result.status}/></div><div className="mt-6 flex gap-3">{props.result.drunix.submitted && <button onClick={() => props.onProof(props.result!.transaction_id)} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white">View Proof</button>}<button onClick={props.onNew} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">New Payment</button></div></div>;
  const currencies = ["AED","USD","EUR","GBP","INR"];
  return <form onSubmit={props.onSubmit} className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-bold text-slate-900">Send Cross-Border Payment</h2><p className="mt-2 text-sm text-slate-500">Create a payment for operational testing.</p><div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Sender Country" value={props.senderCountry} onChange={props.setSenderCountry}/><Field label="Beneficiary Country" value={props.beneficiaryCountry} onChange={props.setBeneficiaryCountry}/><Select label="Source Currency" value={props.sourceCurrency} onChange={props.setSourceCurrency} options={currencies}/><Select label="Destination Currency" value={props.destinationCurrency} onChange={props.setDestinationCurrency} options={currencies}/></div><label className="mt-5 block text-sm font-medium text-slate-700">Amount<input type="number" min="0.01" step="0.01" required value={props.amount} onChange={(e)=>props.setAmount(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"/></label><button type="submit" disabled={props.isSubmitting} className="mt-7 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{props.isSubmitting ? "Processing..." : "Send Payment"}</button></form>;
}

function ProofView({ proof, isLoading }: { proof: SettlementProof | null; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">Verifying settlement...</div>;
  if (!proof) return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h2 className="font-semibold text-slate-900">No settlement proof selected</h2><p className="mt-2 text-sm text-slate-500">Choose Verify from Dashboard or Transactions.</p></div>;
  return <div className="mx-auto max-w-5xl space-y-6"><div className={`rounded-2xl border p-7 ${proof.verified ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className={`text-sm font-semibold ${proof.verified ? "text-emerald-700" : "text-amber-700"}`}>{proof.verified ? "VERIFIED ON DRUNIX" : "NOT VERIFIED"}</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Proof of Settlement</h2><p className="mt-3 break-all font-mono text-xs text-slate-600">{proof.transaction_id}</p></div>{proof.drunix && <div className="grid gap-4 md:grid-cols-3"><Info label="Settlement" value={proof.drunix.settlement_status ?? "—"}/><Info label="Event Sequence" value={String(proof.drunix.event_sequence ?? "—")}/><Info label="Channel" value={proof.drunix.channel ?? "—"}/></div>}<div className="rounded-2xl border border-slate-200 bg-white p-7"><h3 className="font-semibold text-slate-900">Immutable Audit Trail</h3><p className="mt-1 text-sm text-slate-500">{proof.audit.event_count} events retrieved from Drunix</p><div className="mt-5 space-y-3">{proof.audit.events.map((event, index)=><div key={`${event.transactionId}-${event.eventNumber ?? index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold text-slate-800">Event #{event.eventNumber ?? index + 1} • {event.eventType ?? "EVENT"}</p><StatusBadge value={event.settlementStatus ?? "UNKNOWN"}/></div><p className="mt-2 text-xs text-slate-500">{formatDate(event.timestamp ?? null)}</p>{event.ledgerTxId && <p className="mt-2 break-all font-mono text-xs text-slate-400">Ledger Tx: {event.ledgerTxId}</p>}</div>)}</div></div></div>;
}

function getNextSettlementAction(t: TransactionRecord): { status: SettlementLifecycleStatus; label: string } | null {
  const status = t.drunix_status || t.status;
  if (status === "DRUNIX_COMMITTED") return { status: "SETTLEMENT_PROCESSING", label: "Start Settlement" };
  if (status === "SETTLEMENT_PROCESSING") return { status: "SETTLED", label: "Mark Settled" };
  if (status === "SETTLED") return { status: "PAYOUT_COMPLETED", label: "Complete Payout" };
  return null;
}

function canShowProof(t: TransactionRecord) { return Boolean(t.drunix_status && t.drunix_status !== "SUBMISSION_FAILED") || ["DRUNIX_COMMITTED","SETTLEMENT_PROCESSING","SETTLED","PAYOUT_COMPLETED"].includes(t.status); }
function shortId(id: string) { return id.length > 12 ? `${id.slice(0, 8)}…` : id; }
function formatNumber(value: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value)); }
function formatDate(value: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); }
function Metric({title,value,text}:{title:string;value:string;text:string}) { return <div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{text}</p></div>; }
function Info({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 break-words font-semibold text-slate-900">{value}</p></div>; }
function StatusBadge({value}:{value:string}) { const negative=value.includes("BLOCK")||value.includes("FAILED"); const positive=["DRUNIX_COMMITTED","SETTLED","PAYOUT_COMPLETED","APPROVE","APPROVED"].includes(value); return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${negative ? "bg-red-50 text-red-700" : positive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{value}</span>; }
function Banner({kind,message,onClose}:{kind:"error"|"success";message:string;onClose:()=>void}) { return <div className={`mb-6 flex items-start justify-between rounded-xl border p-4 text-sm ${kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span>{message}</span><button onClick={onClose} className="ml-4 font-bold">×</button></div>; }
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) { return <label className="text-sm font-medium text-slate-700">{label}<input required maxLength={2} value={value} onChange={(e)=>onChange(e.target.value.toUpperCase())} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"/></label>; }
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}) { return <label className="text-sm font-medium text-slate-700">{label}<select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3">{options.map(o=><option key={o}>{o}</option>)}</select></label>; }
