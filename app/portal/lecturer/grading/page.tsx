'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
} from 'lucide-react';
import DemoRoleSwitcher from '@/components/DemoRoleSwitcher';

function lookupLocalGrade(totalScore: number, gradeScales: any[]) {
  if (gradeScales.length > 0) {
    const match = gradeScales.find((s) => totalScore >= s.minScore && totalScore <= s.maxScore);
    if (match) {
      return { grade: match.gradeLetter, gpaPoint: match.gradePoint };
    }
  }
  if (totalScore >= 80) return { grade: 'A', gpaPoint: 4.0 };
  if (totalScore >= 75) return { grade: 'B+', gpaPoint: 3.5 };
  if (totalScore >= 70) return { grade: 'B', gpaPoint: 3.0 };
  if (totalScore >= 65) return { grade: 'C+', gpaPoint: 2.5 };
  if (totalScore >= 60) return { grade: 'C', gpaPoint: 2.0 };
  if (totalScore >= 50) return { grade: 'D', gpaPoint: 1.0 };
  return { grade: 'F', gpaPoint: 0.0 };
}

export default function LecturerAutoGradebookPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [components, setComponents] = useState<any[]>([]);
  const [gradeScales, setGradeScales] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [existingResults, setExistingResults] = useState<any[]>([]);

  // New component form
  const [compName, setCompName] = useState('');
  const [compType, setCompType] = useState('ASSIGNMENT');
  const [compSourceType, setCompSourceType] = useState('ASSIGNMENT');
  const [compAutoSync, setCompAutoSync] = useState(true);
  const [compWeight, setCompWeight] = useState(20);
  const [compMaxMarks, setCompMaxMarks] = useState(100);
  const [addingComp, setAddingComp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCourseId = params.get('courseId') || '';

    fetch('/api/lecturer/courses')
      .then((res) => res.json())
      .then((data) => {
        const list = data.courses || [];
        setCourses(list);
        if (list.length > 0) {
          const targetId =
            initialCourseId && list.some((c: any) => c.id === initialCourseId)
              ? initialCourseId
              : list[0].id;
          setSelectedCourseId(targetId);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadGradingData = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lecturer/grading?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to load automated gradebook');
        return;
      }

      setComponents(data.components || []);
      setGradeScales(data.gradeScales || []);
      setEnrolledStudents(data.enrolledStudents || []);
      setExistingResults(data.results || []);
    } catch (e) {
      console.error(e);
      showToast('error', 'Network error loading gradebook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadGradingData(selectedCourseId);
    }
  }, [selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const totalWeight = useMemo(
    () => components.reduce((sum, c) => sum + Number(c.weightPercent || 0), 0),
    [components]
  );

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !compName.trim()) return;
    setAddingComp(true);
    try {
      const res = await fetch('/api/lecturer/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createComponent',
          courseId: selectedCourseId,
          semesterId: selectedCourse?.semesterId || null,
          name: compName,
          componentType: compType,
          sourceType: compSourceType,
          autoSync: compAutoSync,
          weightPercent: Number(compWeight),
          maxMarks: Number(compMaxMarks),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to add component');
        return;
      }
      setCompName('');
      showToast('success', 'Automated assessment component added.');
      await loadGradingData(selectedCourseId);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to add component');
    } finally {
      setAddingComp(false);
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    try {
      const res = await fetch('/api/lecturer/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteComponent', componentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to delete component');
        return;
      }
      showToast('success', 'Component removed.');
      await loadGradingData(selectedCourseId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculateAll = async () => {
    if (!selectedCourseId) return;
    setRecalculating(true);
    try {
      const res = await fetch('/api/lecturer/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_recalculate',
          courseId: selectedCourseId,
          semesterId: selectedCourse?.semesterId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to recalculate grades');
        return;
      }
      showToast(
        'success',
        `Auto-calculated totals, grades, and GPAs for ${data.recalculatedCount ?? 0} student(s).`
      );
      await loadGradingData(selectedCourseId);
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error recalculating gradebook');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <DemoRoleSwitcher />

      <header className="sticky top-0 z-30 bg-[#073832] border-b border-emerald-900/50 text-white px-4 sm:px-8 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/lecturer"
            className="p-1.5 bg-emerald-900/70 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
              Automated Gradebook &amp; Assessment Weighting
            </h1>
            <p className="text-xs text-emerald-200/80">
              100% auto-calculated from completed Exams, Assignments &amp; Topic Assessments
            </p>
          </div>
        </div>

        <button
          onClick={handleRecalculateAll}
          disabled={recalculating || enrolledStudents.length === 0}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>{recalculating ? 'Recalculating...' : 'Recalculate Automatically'}</span>
        </button>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 w-full">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-6 flex-1">
        {/* Course Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-96 text-xs">
            <label className="font-semibold text-slate-700 block mb-1">Select Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title} ({c.semester})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Zero manual mark entry required. Scores sync automatically from graded assessments
              into the Ghana 4.0 GPA scale.
            </span>
          </div>
        </div>

        {/* Automated Assessment Weighting */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" /> Automated Assessment Weighting
              </h2>
              <p className="text-xs text-slate-500">
                Link each weighted component to its assessment source for automatic score syncing.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                Math.abs(totalWeight - 100) < 0.01
                  ? 'bg-emerald-100 text-emerald-800'
                  : totalWeight > 100
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              Total Weight: {totalWeight}% / 100%
            </span>
          </div>

          {components.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {components.map((comp) => (
                <div
                  key={comp.id}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                >
                  <div>
                    <span className="font-bold text-slate-900">{comp.name}</span>
                    <span className="text-slate-500 ml-1.5">
                      ({comp.componentType} · {comp.weightPercent}% · Max {comp.maxMarks})
                    </span>
                    {comp.sourceType && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {comp.autoSync ? `Auto: ${comp.sourceType}` : comp.sourceType}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteComponent(comp.id)}
                    className="text-rose-500 hover:text-rose-700"
                    title="Delete component"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleAddComponent}
            className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs pt-2 border-t border-slate-100"
          >
            <input
              type="text"
              required
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Component name"
              className="col-span-2 sm:col-span-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <select
              value={compType}
              onChange={(e) => setCompType(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="ASSIGNMENT">ASSIGNMENT</option>
              <option value="QUIZ">QUIZ</option>
              <option value="MIDSEM">MIDSEM</option>
              <option value="PRACTICAL">PRACTICAL</option>
              <option value="CLINICAL">CLINICAL</option>
              <option value="FINAL_EXAM">FINAL_EXAM</option>
            </select>
            <select
              value={compSourceType}
              onChange={(e) => setCompSourceType(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="ASSIGNMENT">Source: ASSIGNMENT</option>
              <option value="EXAM">Source: EXAM</option>
              <option value="TOPIC_ASSESSMENT">Source: TOPIC_ASSESSMENT</option>
            </select>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={compWeight}
              onChange={(e) => setCompWeight(Number(e.target.value))}
              placeholder="Weight %"
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <label className="flex items-center gap-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={compAutoSync}
                onChange={(e) => setCompAutoSync(e.target.checked)}
              />
              Auto-Sync
            </label>
            <button
              type="submit"
              disabled={addingComp}
              className="p-2 bg-[#073832] hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>
        </div>

        {/* Auto-Calculated Gradebook Table (Read-Only) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Auto-Calculated Gradebook</h2>
            <span className="text-xs text-slate-400">
              {enrolledStudents.length} enrolled student(s)
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Syncing automated gradebook...
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No enrolled students found for this course.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Student Name</th>
                    {components.map((comp) => (
                      <th key={comp.id} className="py-3 px-3">
                        {comp.name} ({comp.weightPercent}%)
                      </th>
                    ))}
                    <th className="py-3 px-4">CA</th>
                    <th className="py-3 px-4">Exam</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">GPA</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.map((st) => {
                    const resultRow = existingResults.find((r) => r.studentId === st.id);
                    const totalScore = resultRow?.totalScore ?? 0;
                    const fallbackGrade = lookupLocalGrade(totalScore, gradeScales);

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {st.studentId}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{st.user?.name}</td>

                        {components.map((comp) => {
                          const sc = (comp.scores || []).find(
                            (s: any) => s.studentId === st.id
                          );
                          return (
                            <td key={comp.id} className="py-3 px-3 font-mono">
                              <span className="font-bold text-slate-800">
                                {sc ? `${sc.score}/${comp.maxMarks}` : '—'}
                              </span>
                              {sc?.isAutoCalculated && (
                                <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  Auto
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-4 font-mono">
                          {(resultRow?.caScore ?? 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {(resultRow?.examScore ?? 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          {totalScore.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100">
                            {resultRow?.grade || fallbackGrade.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">
                          {(resultRow?.gpaPoint ?? fallbackGrade.gpaPoint).toFixed(1)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {resultRow?.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
