'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, Send, CheckCircle, Clock, Plus, X } from 'lucide-react';
import StudentHeader from '@/components/StudentHeader';

export default function StudentSupportPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Academic');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/student/tickets');
      const d = await res.json();
      if (d.tickets) setTickets(d.tickets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/student/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      });
      const d = await res.json();
      if (d.status) {
        setSubject('');
        setMessage('');
        setShowForm(false);
        setSubmitted(true);
        loadTickets();
        setTimeout(() => setSubmitted(false), 3500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <StudentHeader
        title="Student Support & Enquiries"
        subtitle="Academic Advisory, Portal Support & Administrative Secretariat (Ghana)"
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Official Helpdesk & Tickets</h3>
            <p className="text-xs text-slate-500">Submit requests to academic registrars, exam officers, and accounts.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Open New Ticket</span>
          </button>
        </div>

        {submitted && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Support ticket recorded! Academic Secretariat will review and respond.</span>
          </div>
        )}

        {/* New Ticket Form */}
        {showForm && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Submit an Academic or Administrative Request</h4>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Correction of Middle Name on Student Record"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  >
                    <option value="Academic">Academic Affairs</option>
                    <option value="Finance">Fees & Accounts (GHS)</option>
                    <option value="Examination">CBT & Examination</option>
                    <option value="Clinical">Clinical Ward Placement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Inquiry *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain your inquiry in detail, quoting your student ID if applicable..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Tickets List */}
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {t.category || 'Academic'}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{t.subject}</h4>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full self-start sm:self-auto ${
                    t.status === 'RESOLVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{t.message}</p>

              {t.reply && (
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    Response from Administrative Secretariat:
                  </span>
                  <p>{t.reply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
