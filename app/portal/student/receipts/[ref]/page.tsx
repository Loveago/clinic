'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { formatGHS } from '@/lib/currency';

export default function ReceiptPage() {
  const params = useParams();
  const ref = params?.ref as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/payments/receipt/${ref}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [ref]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-rose-600 font-semibold mb-4">{data?.error || 'Receipt not found'}</p>
        <Link href="/portal/student/payments" className="text-emerald-700 font-medium hover:underline">
          Return to Payments
        </Link>
      </div>
    );
  }

  const { payment, student, invoice, institution } = data;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        {/* Navigation & Print Action */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/portal/student/payments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Payments
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>

        {/* Receipt Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10 print:shadow-none print:border-none">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{institution.name}</h1>
                <p className="text-xs text-slate-500 font-medium mt-1">{institution.location}</p>
                <p className="text-xs text-slate-500">Tel: {institution.phone}</p>
                <p className="text-xs text-emerald-800 font-semibold mt-1">{institution.accreditation}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="w-3.5 h-3.5" /> Official Receipt
                </span>
                <p className="text-xs text-slate-400 mt-2 font-mono">Date: {new Date(payment.date).toLocaleDateString('en-GH')}</p>
              </div>
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Receipt Number</span>
              <span className="text-slate-900 font-mono font-bold text-sm">{payment.receiptNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Transaction Reference</span>
              <span className="text-slate-900 font-mono text-sm">{payment.reference}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Payment Method</span>
              <span className="text-slate-900 font-semibold">{payment.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Payment Processor</span>
              <span className="text-slate-900 font-semibold">Paystack Ghana ({payment.currency})</span>
            </div>
          </div>

          {/* Student Info */}
          {student && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Student Information</h2>
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/60 grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div><span className="font-medium text-slate-500">Student Name:</span> <strong className="text-slate-900">{student.name}</strong></div>
                <div><span className="font-medium text-slate-500">Student ID:</span> <strong className="font-mono text-slate-900">{student.studentId}</strong></div>
                <div><span className="font-medium text-slate-500">Programme:</span> {student.programme}</div>
                <div><span className="font-medium text-slate-500">Academic Level:</span> {student.level}</div>
              </div>
            </div>
          )}

          {/* Itemized Table */}
          <table className="w-full text-left text-sm mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3">
                  <p className="font-semibold text-slate-900">{invoice?.title || 'Academic & Clinical Fees'}</p>
                  <p className="text-xs text-slate-400">{invoice?.invoiceNumber ? `Invoice: ${invoice.invoiceNumber}` : 'Tuition Instalment'}</p>
                </td>
                <td className="py-3 text-right font-black text-slate-900 text-base">
                  {formatGHS(payment.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-slate-200 pt-4 flex flex-col items-end gap-1 text-sm mb-8">
            <div className="flex justify-between w-64 text-slate-600">
              <span>Total Paid:</span>
              <strong className="text-emerald-700 font-bold">{formatGHS(payment.amount)}</strong>
            </div>
            {invoice && (
              <div className="flex justify-between w-64 text-slate-500 text-xs">
                <span>Remaining Balance:</span>
                <span className="font-semibold text-amber-700">{formatGHS(invoice.balance)}</span>
              </div>
            )}
          </div>

          {/* Verification Footer */}
          <div className="pt-6 border-t border-dashed border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Digitally verified and recorded in Ghana Cedis (GH₵).
            </div>
            <p className="font-mono">Accountant General, Action Health</p>
          </div>
        </div>
      </div>
    </div>
  );
}

