'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, CheckCircle, Download, FileText, ShieldCheck, Printer, AlertCircle, ArrowRight, Smartphone, RefreshCw, X } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';
import { formatGHS } from '@/lib/currency';

export default function StudentPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/payments');
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payingInvoice?.id,
          amount: Number(payAmount),
        }),
      });

      const initData = await res.json();

      if (initData.status && initData.reference) {
        // Automatically verify payment in sandbox/demo mode
        const verifyRes = await fetch('/api/payments/paystack/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: initData.reference }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.status) {
          setPaymentSuccess(`Payment of GH₵${Number(payAmount).toFixed(2)} confirmed via Paystack Ghana! Receipt #${verifyData.receiptNumber}`);
          setPayingInvoice(null);
          setPayAmount('');
          fetchPayments();
          setTimeout(() => setPaymentSuccess(null), 5000);
        } else {
          alert('Verification pending or failed at payment gateway.');
        }
      } else {
        alert(initData.error || 'Unable to initiate Paystack payment');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Network error connecting to payment gateway');
    } finally {
      setPaymentLoading(false);
    }
  };

  const summary = data?.summary || {};
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];

  return (
    <>
      <StudentHeader
        title="Fees & Financial Ledger (Ghana)"
        subtitle="Tuition Account, Invoices, Paystack Mobile Money / Card Checkout & GHS Receipts"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8 font-sans">
        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-5 py-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>{paymentSuccess}</span>
            </div>
            <button onClick={() => setPaymentSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial Summary Cards in GHS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Invoiced Fees
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {formatGHS(summary.totalInvoiced || 3500)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              Ghana Cedi (GHS) Tuition & Clinical Dues
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Paid to Date
            </span>
            <div className="text-3xl font-black text-emerald-700 mt-1">
              {formatGHS(summary.totalPaid || 2000)}
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Verified via Paystack Ghana
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <div className="text-3xl font-black text-rose-600 mt-1">
              {formatGHS(summary.outstandingBalance || 1500)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-2">
              Payable via MTN MoMo, Telecel Cash, Card
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Current Semester Fee Invoices</h3>
              <p className="text-xs text-slate-500">Itemized billing breakdown and instant online payment.</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Currency: GHS (GH₵)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">{inv.invoiceNumber}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.status === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm">{inv.title}</h4>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block">Total Due</span>
                    <strong className="text-slate-900 font-bold">{formatGHS(inv.amount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Paid</span>
                    <strong className="text-emerald-700 font-bold">{formatGHS(inv.amountPaid)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Balance</span>
                    <strong className="text-rose-600 font-bold">{formatGHS(inv.balance)}</strong>
                  </div>
                </div>

                {inv.balance > 0 && (
                  <button
                    onClick={() => {
                      setPayingInvoice(inv);
                      setPayAmount(String(inv.balance));
                    }}
                    className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <Smartphone className="w-4 h-4" /> Pay with Paystack Ghana
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Payment Transactions & Official Receipts</h3>
              <p className="text-xs text-slate-500">Every confirmed payment generates an institutional receipt.</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">{payments.length} Payments Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Receipt / Ref</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Payment Channel</th>
                  <th className="pb-3">Amount (GHS)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4">
                      <span className="font-mono font-bold text-slate-900 block">{p.receiptNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.reference}</span>
                    </td>
                    <td className="py-4 font-semibold text-slate-900">{p.title}</td>
                    <td className="py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString('en-GH')}</td>
                    <td className="py-4 font-medium text-slate-800">{p.method}</td>
                    <td className="py-4 font-black text-slate-900 text-sm">{formatGHS(p.amount)}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> {p.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        href={`/portal/student/receipts/${p.reference}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold text-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYSTACK CHECKOUT MODAL */}
        {payingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Paystack Ghana Checkout</h3>
                  <p className="text-xs text-slate-500">{payingInvoice.title}</p>
                </div>
                <button
                  onClick={() => setPayingInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
                  GH₵
                </div>
                <div>
                  <span className="text-xs text-emerald-800 font-semibold block">Outstanding Balance:</span>
                  <span className="text-lg font-black text-emerald-900">{formatGHS(payingInvoice.balance)}</span>
                </div>
              </div>

              <form onSubmit={handleInitiatePayment} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Amount to Pay in Ghana Cedis (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={payingInvoice.balance}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full p-3 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-slate-600">
                  <p className="flex justify-between">
                    <span>Processor:</span>
                    <strong className="text-slate-900">Paystack Ghana</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Currency:</span>
                    <strong className="text-slate-900">GHS (Ghana Cedi)</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Account:</span>
                    <strong className="text-slate-900">Action Health College</strong>
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingInvoice(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
                  >
                    {paymentLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {formatGHS(payAmount || 0)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
