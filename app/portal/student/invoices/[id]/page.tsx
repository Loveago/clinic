'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText, ShieldCheck } from 'lucide-react';

export default function PrintableInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/payments')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.invoices || []).find((i: any) => i.id === id || i.invoiceNumber === id);
        if (found) setInvoice({ ...found, student: d.student });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading Invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">Invoice not found.</p>
        <Link href="/portal/student/payments" className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-bold">
          Back to My Fees
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/portal/student/payments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-800">
          <ArrowLeft className="w-4 h-4" /> Back to My Fees
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF Invoice
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 space-y-6 print:shadow-none print:border-0">
        <div className="flex items-start justify-between border-b-2 border-[#073832] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#073832] text-emerald-300 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#073832]">Action Health Nursing &amp; Midwifery Training College</h1>
              <p className="text-xs text-slate-500">Accra, Ghana · Finance &amp; Bursary Office</p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="font-bold text-slate-900 uppercase">Official Fee Invoice</div>
            <div className="font-mono font-bold text-emerald-700">{invoice.invoiceNumber}</div>
            <div className="text-[11px] text-slate-500">Status: {invoice.status}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Billed To</span>
            <div className="font-bold text-slate-900">{invoice.student?.user?.name || 'Student'}</div>
            <div className="text-slate-600 font-mono">{invoice.student?.studentId}</div>
            <div className="text-slate-600">{invoice.student?.programme?.name}</div>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Academic Period</span>
            <div className="font-bold text-slate-900">{invoice.academicYear} · {invoice.semester}</div>
            <div className="text-slate-600">Due Date: {invoice.dueDate}</div>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount (GHS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((it: any) => (
                <tr key={it.id}>
                  <td className="py-3 font-medium text-slate-800">{it.title}</td>
                  <td className="py-3 text-right font-mono">GH₵ {Number(it.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-3 font-medium text-slate-800">{invoice.title}</td>
                <td className="py-3 text-right font-mono">GH₵ {Number(invoice.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="border-t border-slate-200 pt-4 space-y-1.5 text-xs max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal:</span>
            <span className="font-mono font-bold">GH₵ {Number(invoice.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
          </div>
          {invoice.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Scholarships / Discounts:</span>
              <span className="font-mono font-bold">- GH₵ {Number(invoice.discountAmount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Amount Paid:</span>
            <span className="font-mono font-bold text-emerald-700">GH₵ {Number(invoice.amountPaid).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
            <span>Outstanding Balance:</span>
            <span className="font-mono">GH₵ {Number(invoice.balance).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Pay online via Paystack Ghana (MTN MoMo, Telecel Cash, AT Money, Visa/Mastercard)</span>
          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold"><ShieldCheck className="w-3.5 h-3.5" /> Verified Invoice</span>
        </div>
      </div>
    </div>
  );
}

