'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Plus,
  Search,
  BookOpen,
  HelpCircle,
  ClipboardCheck,
  ArrowLeft,
  Layers,
  Split,
  Merge,
  Check,
  X,
  Copy,
  Award,
  Loader2,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Cpu,
  Key,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

type WorkspaceTab = 'materials' | 'review' | 'questions' | 'assessments' | 'analytics' | 'ai-settings';

export default function AdminPdfLearningPage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('materials');
  const [courses, setCourses] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // AI Providers, Usage & Controlled Regeneration
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [aiEnvInfo, setAiEnvInfo] = useState<{ hasEnvFallback: boolean; envFallbackBaseUrl?: string; envFallbackModel?: string }>({ hasEnvFallback: false });
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerTestResult, setProviderTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    providerType: 'OPENAI_COMPATIBLE',
    apiBaseUrl: 'https://api.openai.com',
    apiEndpoint: '/v1/chat/completions',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    maxOutputTokens: 4000,
    temperature: 0.3,
    timeoutMs: 60000,
    supportsJsonMode: true,
    customHeadersJson: '',
    isActive: true,
    isDefault: true,
  });
  const [regenModal, setRegenModal] = useState<{
    materialId: string;
    materialTitle: string;
    scope: 'TOPICS' | 'NOTES' | 'QUESTIONS' | 'ALL';
  } | null>(null);

  // Filters
  const [materialSearch, setMaterialSearch] = useState('');
  const [qFilterCourse, setQFilterCourse] = useState('');
  const [qFilterTopic, setQFilterTopic] = useState('');
  const [qFilterStatus, setQFilterStatus] = useState('');
  const [qFilterType, setQFilterType] = useState('');
  const [qFilterDiff, setQFilterDiff] = useState('');
  const [qSearch, setQSearch] = useState('');

  // Upload PDF Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    courseId: '',
    programmeId: '',
    academicYear: '2025/2026',
    semester: 'First Semester',
    level: 'Level 100',
    category: 'Core Nursing Module',
  });

  // Topic Editor state
  const [dragOver, setDragOver] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [newTopicForm, setNewTopicForm] = useState({
    title: '',
    description: '',
    pageStart: 1,
    pageEnd: 1,
  });

  // Generate Questions Modal
  const [genTopic, setGenTopic] = useState<any>(null);
  const [genForm, setGenForm] = useState({
    count: 6,
    difficulty: 'MEDIUM',
    questionTypes: ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILL_BLANK', 'SCENARIO'] as string[],
    includeExplanations: true,
    includePageReferences: true,
  });

  // Edit / Create Question Modal
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  // Create Assessment Modal
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    courseId: '',
    topicId: '',
    assessmentType: 'TOPIC_QUIZ',
    durationMinutes: 20,
    passMark: 50,
    maxAttempts: 3,
    randomCount: 5,
    allowReview: true,
    showExplanations: true,
    status: 'PUBLISHED',
  });

  // Manual Grading Modal
  const [gradingAttempt, setGradingAttempt] = useState<{ assessmentId: string; attempt: any } | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marksAwarded: number; feedback: string }>>({});

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadAcademics = useCallback(async () => {
    const res = await fetch('/api/admin/academics');
    const data = await res.json();
    if (data.courses) {
      setCourses(data.courses);
      if (!uploadForm.courseId && data.courses[0]) {
        setUploadForm((f) => ({
          ...f,
          courseId: data.courses[0].id,
          programmeId: data.courses[0].programmeId || '',
        }));
      }
      if (!assessmentForm.courseId && data.courses[0]) {
        setAssessmentForm((f) => ({ ...f, courseId: data.courses[0].id }));
      }
    }
    if (data.programmes) setProgrammes(data.programmes);
  }, []);

  const loadMaterials = useCallback(async () => {
    const res = await fetch('/api/admin/learning-materials');
    const data = await res.json();
    if (data.materials) setMaterials(data.materials);
  }, []);

  const loadMaterialDetail = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/learning-materials/${id}`);
      const data = await res.json();
      if (data.material) {
        setSelectedMaterial(data.material);
        setSelectedTopic(data.material.extractedTopics?.[0] || null);
        setActiveTab('review');
      }
    } finally {
      setBusy(false);
    }
  };

  const loadQuestions = useCallback(async () => {
    const params = new URLSearchParams();
    if (qFilterCourse) params.set('courseId', qFilterCourse);
    if (qFilterTopic) params.set('topicId', qFilterTopic);
    if (qFilterStatus) params.set('status', qFilterStatus);
    if (qFilterType) params.set('questionType', qFilterType);
    if (qFilterDiff) params.set('difficulty', qFilterDiff);
    if (qSearch) params.set('search', qSearch);
    const res = await fetch(`/api/admin/question-bank?${params.toString()}`);
    const data = await res.json();
    if (data.questions) setQuestions(data.questions);
  }, [qFilterCourse, qFilterTopic, qFilterStatus, qFilterType, qFilterDiff, qSearch]);

  const loadAssessments = useCallback(async () => {
    const res = await fetch('/api/admin/topic-assessments');
    const data = await res.json();
    if (data.assessments) setAssessments(data.assessments);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const res = await fetch('/api/admin/learning-analytics');
    const data = await res.json();
    if (data.overview) setAnalytics(data);
  }, []);

  const loadAiSettings = useCallback(async () => {
    try {
      const [provRes, usageRes] = await Promise.all([
        fetch('/api/admin/ai-providers'),
        fetch('/api/admin/ai-usage'),
      ]);
      if (provRes.ok) {
        const pData = await provRes.json();
        setAiProviders(pData.providers || []);
        setAiEnvInfo({
          hasEnvFallback: Boolean(pData.hasEnvFallback),
          envFallbackBaseUrl: pData.envFallbackBaseUrl,
          envFallbackModel: pData.envFallbackModel,
        });
      }
      if (usageRes.ok) {
        setAiUsage(await usageRes.json());
      }
    } catch {
      // Non-blocking if lecturer lacks provider admin access
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAcademics(), loadMaterials(), loadQuestions(), loadAssessments(), loadAnalytics(), loadAiSettings()]).finally(() =>
      setLoading(false)
    );
  }, [loadAcademics, loadMaterials, loadQuestions, loadAssessments, loadAnalytics, loadAiSettings]);

  const handleMoveTopic = async (topicIdx: number, dir: -1 | 1) => {
    if (!selectedMaterial?.extractedTopics) return;
    const list = [...selectedMaterial.extractedTopics];
    const targetIdx = topicIdx + dir;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[topicIdx], list[targetIdx]] = [list[targetIdx], list[topicIdx]];
    const res = await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', orderedTopicIds: list.map((t: any) => t.id) }),
    });
    if (res.ok) {
      notify('Topic order updated.');
      await loadMaterialDetail(selectedMaterial.id);
    }
  };

  const handleDuplicateAssessment = async (assessmentId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topic-assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      if (res.ok) {
        notify('Assessment duplicated as Draft.');
        await loadAssessments();
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Upload PDF handler
  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return notify('Please select a PDF file.', 'err');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v));
      fd.append('processMode', 'sync');

      const res = await fetch('/api/admin/learning-materials', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Upload failed', 'err');
      } else {
        notify(
          data.processingResult?.success
            ? `PDF processed! Extracted ${data.processingResult.topicsCount} topics.`
            : data.processingResult?.error || 'PDF uploaded.',
          data.processingResult?.success === false ? 'err' : 'ok'
        );
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadForm((f) => ({ ...f, title: '', description: '' }));
        await loadMaterials();
        if (data.material?.id) {
          await loadMaterialDetail(data.material.id);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReplacePdf = async (materialId: string, file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/admin/learning-materials/${materialId}`, {
        method: 'PATCH',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'PDF replacement failed', 'err');
      } else {
        notify(
          data.processingResult?.success
            ? `PDF replaced & reprocessed (${data.processingResult.topicsCount} topics).`
            : 'PDF replaced.',
          data.processingResult?.success === false ? 'err' : 'ok'
        );
        await loadMaterials();
        if (selectedMaterial?.id === materialId) {
          await loadMaterialDetail(materialId);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMaterialAction = async (id: string, payload: any, msg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/learning-materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Action failed', 'err');
      } else {
        notify(msg);
        await loadMaterials();
        await loadAiSettings();
        if (selectedMaterial?.id === id) await loadMaterialDetail(id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!regenModal) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/learning-materials/${regenModal.materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          scope: regenModal.scope,
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Regeneration failed', 'err');
      } else {
        notify(`Regenerated ${regenModal.scope} for "${regenModal.materialTitle}".`);
        const targetId = regenModal.materialId;
        setRegenModal(null);
        await Promise.all([loadMaterials(), loadQuestions(), loadAiSettings()]);
        if (selectedMaterial?.id === targetId) await loadMaterialDetail(targetId);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProviderTestResult(null);
    try {
      const method = editingProviderId ? 'PATCH' : 'POST';
      const payload = editingProviderId ? { id: editingProviderId, ...providerForm } : providerForm;
      const res = await fetch('/api/admin/ai-providers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not save AI provider', 'err');
      } else {
        notify(editingProviderId ? 'AI provider updated.' : 'AI provider saved.');
        setEditingProviderId(null);
        setProviderForm({
          name: '',
          providerType: 'OPENAI_COMPATIBLE',
          apiBaseUrl: 'https://api.openai.com',
          apiEndpoint: '/v1/chat/completions',
          apiKey: '',
          modelName: 'gpt-4o-mini',
          maxOutputTokens: 4000,
          temperature: 0.3,
          timeoutMs: 60000,
          supportsJsonMode: true,
          customHeadersJson: '',
          isActive: true,
          isDefault: false,
        });
        await loadAiSettings();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTestProvider = async (providerId?: string) => {
    setBusy(true);
    setProviderTestResult(null);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          providerId
            ? { action: 'test', id: providerId }
            : { action: 'test', ...providerForm }
        ),
      });
      const data = await res.json();
      setProviderTestResult(data);
      notify(data.message || (data.ok ? 'Connection successful' : 'Connection failed'), data.ok ? 'ok' : 'err');
      if (providerId) await loadAiSettings();
    } finally {
      setBusy(false);
    }
  };

  const handleSetDefaultProvider = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isDefault: true, isActive: true }),
      });
      if (res.ok) {
        notify('Default AI provider updated (existing PDFs will NOT be reprocessed).');
        await loadAiSettings();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this AI provider configuration?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-providers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        notify('AI provider deleted.');
        await loadAiSettings();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Delete this PDF learning material and its extracted topics?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/learning-materials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Learning material deleted.');
        if (selectedMaterial?.id === id) setSelectedMaterial(null);
        await loadMaterials();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApproveAllAndPublish = async (materialId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_all', materialId }),
      });
      if (res.ok) {
        notify('All topics approved and PDF learning material published to students!');
        await loadMaterials();
        await loadMaterialDetail(materialId);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTopicEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topics/${editingTopic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTopic.title,
          description: editingTopic.description,
          summary: editingTopic.summary,
          rawText: editingTopic.rawText,
          pageStart: editingTopic.pageStart,
          pageEnd: editingTopic.pageEnd,
          status: editingTopic.status,
          needsReview: false,
        }),
      });
      if (res.ok) {
        notify('Topic updated.');
        setEditingTopic(null);
        if (selectedMaterial) await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTopicStatus = async (topicId: string, status: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, needsReview: false }),
      });
      if (res.ok) {
        notify(`Topic marked as ${status}.`);
        if (selectedMaterial) await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSplitTopic = async (topicId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split' }),
      });
      if (res.ok) {
        notify('Topic split into two sections for review.');
        if (selectedMaterial) await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Remove this extracted topic?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, { method: 'DELETE' });
      if (res.ok) {
        notify('Topic removed.');
        if (selectedMaterial) await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddManualTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: selectedMaterial.id, ...newTopicForm }),
      });
      if (res.ok) {
        notify('Manual topic added.');
        setShowAddTopicModal(false);
        setNewTopicForm({ title: '', description: '', pageStart: 1, pageEnd: 1 });
        await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/topics/${genTopic.id}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Generation failed', 'err');
      } else {
        notify(`Generated ${data.createdCount} draft questions for "${genTopic.title}"!`);
        setGenTopic(null);
        await loadQuestions();
        if (selectedMaterial) await loadMaterialDetail(selectedMaterial.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleQuestionAction = async (id: string, payload: any, msg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        notify(msg);
        await loadQuestions();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBulkApproveQuestions = async () => {
    const draftIds = questions.filter((q) => q.status === 'DRAFT').map((q) => q.id);
    if (draftIds.length === 0) return notify('No draft questions in current filter.', 'err');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_status', questionIds: draftIds, status: 'APPROVED' }),
      });
      if (res.ok) {
        notify(`Approved ${draftIds.length} questions.`);
        await loadQuestions();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveQuestionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/question-bank/${editingQuestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: editingQuestion.questionText,
          correctAnswer: editingQuestion.correctAnswer,
          explanation: editingQuestion.explanation,
          difficulty: editingQuestion.difficulty,
          marks: Number(editingQuestion.marks),
          status: editingQuestion.status,
        }),
      });
      if (res.ok) {
        notify('Question updated.');
        setEditingQuestion(null);
        await loadQuestions();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/topic-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessmentForm),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not create assessment', 'err');
      } else {
        notify('Assessment created successfully!');
        setShowCreateAssessment(false);
        await loadAssessments();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitManualGrades = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingAttempt) return;
    setBusy(true);
    try {
      const grades = Object.entries(gradeInputs).map(([answerId, g]) => ({
        answerId,
        marksAwarded: g.marksAwarded,
        feedback: g.feedback,
      }));
      const res = await fetch(`/api/admin/topic-assessments/${gradingAttempt.assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade_attempt',
          attemptId: gradingAttempt.attempt.id,
          grades,
        }),
      });
      if (res.ok) {
        notify('Manual grades saved & student mastery updated!');
        setGradingAttempt(null);
        await loadAssessments();
      }
    } finally {
      setBusy(false);
    }
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
      m.courseTitle.toLowerCase().includes(materialSearch.toLowerCase()) ||
      m.courseCode.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      PUBLISHED: 'bg-emerald-100 text-emerald-800',
      APPROVED: 'bg-sky-100 text-sky-800',
      DRAFT: 'bg-slate-100 text-slate-700',
      PENDING: 'bg-amber-100 text-amber-800',
      QUEUED: 'bg-amber-100 text-amber-800',
      PROCESSING: 'bg-amber-100 text-amber-800',
      EXTRACTING_PDF: 'bg-amber-100 text-amber-800',
      EXTRACTING_TOPICS: 'bg-amber-100 text-amber-800',
      GENERATING_NOTES: 'bg-amber-100 text-amber-800',
      GENERATING_QUESTIONS: 'bg-amber-100 text-amber-800',
      SAVING_RESULTS: 'bg-amber-100 text-amber-800',
      REVIEW_REQUIRED: 'bg-orange-100 text-orange-800',
      REQUIRES_REVIEW: 'bg-orange-100 text-orange-800',
      FAILED: 'bg-red-100 text-red-800',
      REJECTED: 'bg-red-100 text-red-800',
      ARCHIVED: 'bg-slate-200 text-slate-600',
    };
    return map[s] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="bg-[#073832] text-white border-b border-emerald-900/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal/admin"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition"
              title="Back to Main Admin Panel"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                Learning Materials &amp; Topic-Based Assessment System
              </h1>
              <p className="text-xs text-emerald-200/80">
                PDF Upload · Automatic Topic Extraction · Topic Question Generator · Assessments &amp; Grading
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-[#2bc489] text-[#073832] font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Course PDF</span>
          </button>
        </div>

        {/* Sub-navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-900/60 flex gap-2 overflow-x-auto py-2 text-xs font-semibold">
          {[
            { id: 'materials', label: '1. Learning Materials (PDFs)', icon: FileText, count: materials.length },
            { id: 'review', label: '2. PDF Topic Review Workspace', icon: Layers },
            { id: 'questions', label: '3. Topic Question Bank', icon: HelpCircle, count: questions.length },
            { id: 'assessments', label: '4. Assessments & Results', icon: ClipboardCheck, count: assessments.length },
            { id: 'analytics', label: '5. Learning Analytics & History', icon: BarChart3 },
            { id: 'ai-settings', label: '6. AI Providers & Usage', icon: Settings, count: aiProviders.length },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as WorkspaceTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition ${
                  active ? 'bg-white text-[#073832] shadow-sm' : 'text-emerald-100/80 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-emerald-100 text-[#073832]' : 'bg-emerald-900 text-emerald-200'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 ${
            toast.type === 'err' ? 'bg-red-600 text-white' : 'bg-[#073832] text-emerald-200 border border-emerald-500/40'
          }`}
        >
          {toast.type === 'err' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading PDF Learning Workspace...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: LEARNING MATERIALS TABLE */}
            {activeTab === 'materials' && (
              <div className="space-y-4">
                {/* Real-DB Overview KPI Strip */}
                {analytics?.overview && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {[
                      { label: 'Total PDFs', val: analytics.overview.totalMaterials },
                      { label: 'Processed', val: analytics.overview.processedMaterials },
                      { label: 'Processing', val: analytics.overview.processingNow },
                      { label: 'Awaiting Review', val: analytics.overview.awaitingReview },
                      { label: 'Failed', val: analytics.overview.failedMaterials },
                      { label: 'Published', val: analytics.overview.publishedMaterials },
                      { label: 'Topics Extracted', val: analytics.overview.totalTopics },
                      { label: 'Questions Bank', val: analytics.overview.totalQuestions },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm text-center">
                        <div className="text-lg font-black text-[#073832]">{kpi.val}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      placeholder="Search PDFs by title or course..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {filteredMaterials.length} PDF learning materials
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-4">Document Title</th>
                        <th className="p-4">Course &amp; Level</th>
                        <th className="p-4">Processing</th>
                        <th className="p-4">Topics</th>
                        <th className="p-4">Questions</th>
                        <th className="p-4">Publication</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-400">
                            No PDF learning materials uploaded yet. Click &ldquo;Upload Course PDF&rdquo; to begin.
                          </td>
                        </tr>
                      ) : (
                        filteredMaterials.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/70">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{m.title}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  v{m.pdfVersion || 1}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {m.fileSize} · {m.pageCount || '—'} pages · {new Date(m.createdAt).toLocaleDateString('en-GH')}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-emerald-800">
                                {m.courseCode} — {m.courseTitle}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {m.programmeName} · {m.level}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(m.processingStatus)}`}>
                                {m.processingStatus}
                              </span>
                              {m.latestJob && (
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {m.latestJob.providerName || 'Local Parser'}
                                  {m.latestJob.modelName ? ` · ${m.latestJob.modelName}` : ''}
                                  {m.latestJob.totalTokens ? ` · ${m.latestJob.totalTokens.toLocaleString()} tok` : ''}
                                </div>
                              )}
                              {m.latestJob?.errorMessage && (
                                <p className="text-[10px] text-red-600 mt-1 max-w-[200px]">
                                  {m.latestJob.errorMessage}
                                </p>
                              )}
                            </td>
                            <td className="p-4 font-bold text-slate-800">{m.topicsCount}</td>
                            <td className="p-4 font-bold text-slate-800">{m.questionsCount}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusBadge(m.status)}`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => loadMaterialDetail(m.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Review Topics</span>
                                </button>
                                <button
                                  onClick={() => handleMaterialAction(m.id, { action: 'reprocess' }, 'PDF processed / checked.')}
                                  disabled={busy}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                                  title="Retry Failed Processing"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setRegenModal({
                                      materialId: m.id,
                                      materialTitle: m.title,
                                      scope: 'ALL',
                                    })
                                  }
                                  disabled={busy}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg"
                                  title="Controlled AI Regeneration (Topics, Notes, or Questions)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <label
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                  title="Replace PDF File"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    className="hidden"
                                    disabled={busy}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleReplacePdf(m.id, f);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                {m.status !== 'PUBLISHED' ? (
                                  <button
                                    onClick={() => handleMaterialAction(m.id, { status: 'PUBLISHED' }, 'Material published to students.')}
                                    disabled={busy}
                                    className="px-2.5 py-1.5 bg-[#073832] text-white rounded-lg font-bold"
                                  >
                                    Publish
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMaterialAction(m.id, { status: 'ARCHIVED' }, 'Material archived.')}
                                    disabled={busy}
                                    className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold"
                                  >
                                    Archive
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMaterial(m.id)}
                                  disabled={busy}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: PDF TOPIC REVIEW WORKSPACE (SPLIT SCREEN) */}
            {activeTab === 'review' && (
              <div className="space-y-4">
                {!selectedMaterial ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
                    <BookOpen className="w-10 h-10 text-emerald-700 mx-auto" />
                    <h3 className="text-base font-bold">Select a PDF Material to Review Extracted Topics</h3>
                    <p className="text-xs text-slate-500">
                      Choose any uploaded PDF from the Learning Materials tab or pick one below:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {materials.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => loadMaterialDetail(m.id)}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-200"
                        >
                          {m.title} ({m.topicsCount} topics)
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Review Header */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-[#073832]">{selectedMaterial.title}</h2>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(selectedMaterial.processingStatus)}`}>
                            {selectedMaterial.processingStatus}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(selectedMaterial.status)}`}>
                            {selectedMaterial.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedMaterial.course?.code} — {selectedMaterial.course?.title} · {selectedMaterial.pageCount} pages · {selectedMaterial.extractedTopics?.length || 0} extracted topics
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowAddTopicModal(true)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Manual Topic</span>
                        </button>
                        <button
                          onClick={() => handleMaterialAction(selectedMaterial.id, { action: 'reprocess' }, 'PDF reprocessed.')}
                          disabled={busy}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reprocess PDF</span>
                        </button>
                        <button
                          onClick={() => handleApproveAllAndPublish(selectedMaterial.id)}
                          disabled={busy}
                          className="px-4 py-2 bg-[#073832] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Approve All &amp; Publish Material</span>
                        </button>
                      </div>
                    </div>

                    {/* Split Workspace: Left = Original PDF Preview, Right = Extracted Topics & Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Original PDF Preview with Page & Zoom Controls */}
                      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-[760px]">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
                              title="Previous Page"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-bold text-slate-700 px-1.5">
                              p. {pdfPage} / {selectedMaterial.pageCount || 1}
                            </span>
                            <button
                              onClick={() => setPdfPage((p) => Math.min(selectedMaterial.pageCount || 1, p + 1))}
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
                              title="Next Page"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPdfZoom((z) => Math.max(50, z - 25))}
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
                              title="Zoom Out"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-bold text-slate-600">{pdfZoom}%</span>
                            <button
                              onClick={() => setPdfZoom((z) => Math.min(200, z + 25))}
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
                              title="Zoom In"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={selectedMaterial.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-emerald-700 hover:underline ml-2"
                            >
                              New Tab
                            </a>
                          </div>
                        </div>
                        <iframe
                          key={`${selectedMaterial.id}-${pdfPage}-${pdfZoom}`}
                          src={`${selectedMaterial.fileUrl}#page=${pdfPage}&zoom=${pdfZoom}`}
                          className="w-full flex-1 bg-slate-100"
                          title="Original PDF Preview"
                        />
                      </div>

                      {/* Right: Extracted Topics & Structured Content */}
                      <div className="lg:col-span-7 space-y-4">
                        {selectedMaterial.extractedTopics?.length === 0 ? (
                          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                            <p className="text-sm font-bold text-slate-800">No Topics Extracted</p>
                            <p className="text-xs text-slate-500">
                              {selectedMaterial.processingJobs?.[0]?.errorMessage ||
                                'Add topics manually or retry PDF processing.'}
                            </p>
                          </div>
                        ) : (
                          selectedMaterial.extractedTopics.map((topic: any) => {
                            const isSelected = selectedTopic?.id === topic.id;
                            const content = topic.contentJson ? JSON.parse(topic.contentJson) : null;
                            return (
                              <div
                                key={topic.id}
                                onClick={() => setSelectedTopic(topic)}
                                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer space-y-3 ${
                                  isSelected
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-md'
                                    : 'border-slate-200 hover:border-emerald-300'
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        Topic #{topic.orderIndex} · pp. {topic.pageStart}–{topic.pageEnd}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(topic.status)}`}>
                                        {topic.status}
                                      </span>
                                      {topic.needsReview && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                          Needs Review
                                        </span>
                                      )}
                                      {topic.isDuplicate && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                                          Possible Duplicate
                                        </span>
                                      )}
                                    </div>
                                    <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                                      {topic.title}
                                    </h3>
                                  </div>

                                  <div className="text-right text-[11px] font-bold text-slate-500">
                                    {topic._count?.questions || 0} Questions
                                  </div>
                                </div>

                                {topic.reviewNotes && (
                                  <div className="text-[11px] bg-amber-50 text-amber-800 px-3 py-2 rounded-xl border border-amber-200">
                                    {topic.reviewNotes}
                                  </div>
                                )}

                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {topic.description || content?.introduction}
                                </p>

                                {topic.subtopics?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {topic.subtopics.map((sub: any) => (
                                      <span
                                        key={sub.id}
                                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                                      >
                                        {sub.title}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div
                                  className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      onClick={() => setGenTopic(topic)}
                                      className="px-3 py-1.5 bg-[#073832] hover:bg-emerald-900 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                                      <span>Generate Questions</span>
                                    </button>
                                    <button
                                      onClick={() => setEditingTopic({ ...topic })}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold"
                                    >
                                      Edit Content
                                    </button>
                                    <button
                                      onClick={() => handleSplitTopic(topic.id)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                                    >
                                      <Split className="w-3 h-3" />
                                      <span>Split</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {topic.status === 'DRAFT' && (
                                      <button
                                        onClick={() => handleTopicStatus(topic.id, 'APPROVED')}
                                        className="px-2.5 py-1.5 bg-sky-600 text-white rounded-lg text-[11px] font-bold"
                                      >
                                        Approve Topic
                                      </button>
                                    )}
                                    {topic.status !== 'PUBLISHED' && (
                                      <button
                                        onClick={() => handleTopicStatus(topic.id, 'PUBLISHED')}
                                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                                      >
                                        Publish
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteTopic(topic.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                      title="Delete Topic"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: QUESTION BANK & REVIEW */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={qSearch}
                        onChange={(e) => setQSearch(e.target.value)}
                        placeholder="Search questions or topic..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                      />
                    </div>
                    <select
                      value={qFilterCourse}
                      onChange={(e) => setQFilterCourse(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="">All Courses</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={qFilterType}
                      onChange={(e) => setQFilterType(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="">All Types</option>
                      <option value="MCQ">MCQ</option>
                      <option value="TRUE_FALSE">True / False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="FILL_BLANK">Fill in the Blank</option>
                      <option value="MATCHING">Matching</option>
                      <option value="SCENARIO">Scenario-Based</option>
                    </select>
                    <select
                      value={qFilterDiff}
                      onChange={(e) => setQFilterDiff(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="">All Difficulties</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="DIFFICULT">Difficult</option>
                    </select>
                    <select
                      value={qFilterStatus}
                      onChange={(e) => setQFilterStatus(e.target.value)}
                      className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                    >
                      <option value="">All Statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <button
                    onClick={handleBulkApproveQuestions}
                    disabled={busy}
                    className="px-4 py-2 bg-[#073832] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Approve All Drafts</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500">
                      No questions match the current filters. Generate questions from any extracted topic in the Topic Review Workspace.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">
                              {q.questionType}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {q.difficulty} · {q.marks} Marks
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(q.status)}`}>
                              {q.status}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              Topic: {q.topic?.title} {q.pageRef ? `(${q.pageRef})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {q.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => handleQuestionAction(q.id, { status: 'APPROVED' }, 'Question approved.')}
                                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleQuestionAction(q.id, { status: 'REJECTED' }, 'Question rejected.')}
                                  className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[11px] font-bold"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setEditingQuestion({ ...q })}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleQuestionAction(q.id, { action: 'duplicate' }, 'Question duplicated.')}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-slate-900">{q.questionText}</p>
                        <div className="text-xs text-emerald-800 bg-emerald-50/70 px-3 py-2 rounded-xl border border-emerald-100">
                          <span className="font-bold">Answer:</span> {q.correctAnswer}
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-slate-500">
                            <span className="font-bold">Explanation:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ASSESSMENTS & RESULTS */}
            {activeTab === 'assessments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#073832]">Topic Assessments &amp; Quizzes</h2>
                    <p className="text-xs text-slate-500">
                      Create topic quizzes or multi-topic tests from approved questions and review student attempts.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateAssessment(true)}
                    className="px-4 py-2.5 bg-[#073832] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-emerald-300" />
                    <span>Create Topic Assessment</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {assessments.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-xs text-slate-500">
                      No topic assessments created yet. Approve topic questions first, then click &ldquo;Create Topic Assessment&rdquo;.
                    </div>
                  ) : (
                    assessments.map((a) => (
                      <div key={a.id} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">
                                {a.assessmentType}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(a.status)}`}>
                                {a.status}
                              </span>
                            </div>
                            <h3 className="text-base font-extrabold text-slate-900 mt-1">{a.title}</h3>
                            <p className="text-xs text-slate-500">
                              {a.courseCode} — {a.courseTitle} {a.topic ? `· Topic: ${a.topic.title}` : ''} · {a.questionsCount} Questions · {a.totalMarks} Marks · {a.durationMinutes} mins
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-center">
                            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                              <div className="text-sm font-black text-slate-900">{a.submittedCount}</div>
                              <div className="text-[10px] text-slate-500">Submissions</div>
                            </div>
                            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                              <div className="text-sm font-black text-emerald-700">{a.avgPercentage}%</div>
                              <div className="text-[10px] text-slate-500">Avg Score</div>
                            </div>
                            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                              <div className="text-sm font-black text-emerald-700">{a.passRate}%</div>
                              <div className="text-[10px] text-slate-500">Pass Rate</div>
                            </div>
                          </div>
                        </div>

                        {a.attempts?.length > 0 && (
                          <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Student Attempts
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50">
                                  <tr>
                                    <th className="p-2.5">Student</th>
                                    <th className="p-2.5">Attempt</th>
                                    <th className="p-2.5">Score</th>
                                    <th className="p-2.5">Status</th>
                                    <th className="p-2.5 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {a.attempts.map((att: any) => (
                                    <tr key={att.id}>
                                      <td className="p-2.5 font-semibold">
                                        {att.studentName} <span className="text-slate-400">({att.studentRegNo})</span>
                                      </td>
                                      <td className="p-2.5">#{att.attemptNumber}</td>
                                      <td className="p-2.5 font-bold">
                                        {att.totalScore}/{att.maxScore} ({att.percentage}%)
                                      </td>
                                      <td className="p-2.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          att.status === 'NEEDS_MANUAL_GRADING'
                                            ? 'bg-amber-100 text-amber-800'
                                            : att.passed
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                          {att.status}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-right">
                                        <button
                                          onClick={() => {
                                            const init: Record<string, { marksAwarded: number; feedback: string }> = {};
                                            att.answers
                                              ?.filter((ans: any) => ans.question?.questionType === 'SHORT_ANSWER')
                                              .forEach((ans: any) => {
                                                init[ans.id] = {
                                                  marksAwarded: ans.marksAwarded || 0,
                                                  feedback: ans.graderFeedback || '',
                                                };
                                              });
                                            setGradeInputs(init);
                                            setGradingAttempt({ assessmentId: a.id, attempt: att });
                                          }}
                                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold"
                                        >
                                          Review / Grade
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: LEARNING ANALYTICS & PROCESSING HISTORY */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#073832]">Student Learning Analytics &amp; Processing Logs</h2>
                    <p className="text-xs text-slate-500">
                      Real-time engagement, topic mastery rates, individual student reports, and PDF processing history.
                    </p>
                  </div>
                  <a
                    href="/api/admin/learning-analytics?format=csv"
                    className="px-4 py-2.5 bg-[#073832] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4 text-emerald-300" />
                    <span>Export Student Learning CSV</span>
                  </a>
                </div>

                {/* Engagement Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { label: 'Total Students', val: analytics.engagement.totalStudents },
                    { label: 'Active Learners', val: analytics.engagement.activeLearners },
                    { label: 'Not Started', val: analytics.engagement.notStarted },
                    { label: 'Topics Completed', val: analytics.engagement.topicsCompleted },
                    { label: 'Quiz Attempts', val: analytics.engagement.quizAttempts },
                    { label: 'Average Score', val: `${analytics.engagement.averageScore}%` },
                    { label: 'Pass Rate', val: `${analytics.engagement.passRate}%` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-200 text-center shadow-sm">
                      <div className="text-xl font-black text-[#073832]">{s.val}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Topic Performance Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Topic-Level Performance &amp; Revision Hotspots
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 text-[10px] uppercase text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3.5">Topic</th>
                          <th className="p-3.5">Accessed</th>
                          <th className="p-3.5">Completion Rate</th>
                          <th className="p-3.5">Quiz Attempts</th>
                          <th className="p-3.5">Avg Score</th>
                          <th className="p-3.5">Pass Rate</th>
                          <th className="p-3.5">Needs Revision</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.topicAnalytics?.length === 0 ? (
                          <tr><td colSpan={7} className="p-6 text-center text-slate-400">No topic analytics yet.</td></tr>
                        ) : (
                          analytics.topicAnalytics?.map((t: any) => (
                            <tr key={t.id}>
                              <td className="p-3.5 font-bold text-slate-900">{t.title}</td>
                              <td className="p-3.5">{t.accessedCount} students</td>
                              <td className="p-3.5 font-semibold">{t.completionRate}%</td>
                              <td className="p-3.5">{t.quizAttempts}</td>
                              <td className="p-3.5 font-bold text-emerald-700">{t.avgScore}%</td>
                              <td className="p-3.5 font-bold">{t.passRate}%</td>
                              <td className="p-3.5">
                                {t.needsRevisionCount > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    {t.needsRevisionCount} students
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Student Learning Reports Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Individual Student Learning Reports
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 text-[10px] uppercase text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="p-3.5">Student</th>
                          <th className="p-3.5">Programme &amp; Level</th>
                          <th className="p-3.5">Topics Opened / Done</th>
                          <th className="p-3.5">Quiz Attempts</th>
                          <th className="p-3.5">Avg Score</th>
                          <th className="p-3.5">Weak Topics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.studentReports?.map((sr: any) => (
                          <tr key={sr.id}>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{sr.name}</div>
                              <div className="text-[11px] text-slate-500">{sr.studentRegNo}</div>
                            </td>
                            <td className="p-3.5 text-slate-600">{sr.programme} · {sr.level}</td>
                            <td className="p-3.5 font-semibold">{sr.topicsOpened} opened / {sr.topicsCompleted} done</td>
                            <td className="p-3.5">{sr.quizAttempts}</td>
                            <td className="p-3.5 font-bold text-emerald-700">{sr.averageScore}%</td>
                            <td className="p-3.5 text-[11px] text-amber-700">
                              {sr.weakTopics?.length > 0 ? sr.weakTopics.join(', ') : 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PDF Processing History */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Recent PDF Processing Jobs
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {analytics.processingHistory?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">No PDF processing jobs recorded yet.</div>
                    ) : (
                      analytics.processingHistory?.map((job: any) => (
                        <div key={job.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{job.material?.title || job.materialId}</div>
                            <div className="text-[11px] text-slate-500">
                              {job.currentStage || job.status} · {job.totalPages} pages · {new Date(job.createdAt).toLocaleString('en-GH')}
                            </div>
                            {job.errorMessage && (
                              <div className="text-[11px] text-red-600 mt-0.5">{job.errorMessage}</div>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusBadge(job.status)}`}>
                            {job.status} ({job.progress}%)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: AI PROVIDERS & USAGE */}
            {activeTab === 'ai-settings' && (
              <div className="space-y-6">
                {/* One-time processing guarantee banner */}
                <div className="bg-emerald-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-extrabold uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      <span>One-Time AI Processing &amp; Permanent Storage Active</span>
                    </div>
                    <p className="text-xs text-emerald-100/90 max-w-3xl">
                      AI runs only once per uploaded PDF version. All extracted topics, study notes, and questions are saved permanently in the database. Student learning, quizzes, and switching AI providers never trigger automatic AI calls.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-emerald-200/80">Env Fallback</div>
                    <div className="text-xs font-bold">
                      {aiEnvInfo.hasEnvFallback ? `${aiEnvInfo.envFallbackModel} (${aiEnvInfo.envFallbackBaseUrl})` : 'Not Set (Using DB / Local)'}
                    </div>
                  </div>
                </div>

                {/* Usage KPIs */}
                {aiUsage?.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">PDFs Processed</div>
                      <div className="text-2xl font-extrabold text-[#073832] mt-1">{aiUsage.summary.totalPdfsProcessed}</div>
                      <div className="text-[11px] text-slate-500">{aiUsage.summary.successfulJobs} ok · {aiUsage.summary.failedJobs} failed</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Total Tokens Used</div>
                      <div className="text-2xl font-extrabold text-[#073832] mt-1">{(aiUsage.summary.totalTokens || 0).toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500">
                        In: {(aiUsage.summary.totalInputTokens || 0).toLocaleString()} · Out: {(aiUsage.summary.totalOutputTokens || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Regenerations</div>
                      <div className="text-2xl font-extrabold text-amber-700 mt-1">{aiUsage.summary.regenerationJobs}</div>
                      <div className="text-[11px] text-slate-500">Explicit admin confirmations</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Active Providers</div>
                      <div className="text-2xl font-extrabold text-[#073832] mt-1">{aiProviders.filter((p) => p.isActive).length}</div>
                      <div className="text-[11px] text-slate-500">{aiProviders.find((p) => p.isDefault)?.name || 'Env / Local Fallback'}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Configured Providers List */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-emerald-700" />
                          <span>Configured OpenAI-Compatible Providers</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{aiProviders.length} configured</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {aiProviders.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            No database AI providers configured yet. Add an OpenAI-compatible provider on the right (OpenAI, OpenRouter, Together, Groq, DeepSeek, or local Ollama/vLLM).
                          </div>
                        ) : (
                          aiProviders.map((p) => (
                            <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                                  {p.isDefault && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      DEFAULT
                                    </span>
                                  )}
                                  {!p.isActive && (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                      DISABLED
                                    </span>
                                  )}
                                  {p.lastTestStatus && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.lastTestStatus === 'SUCCESS' ? 'bg-sky-100 text-sky-800' : 'bg-red-100 text-red-700'}`}>
                                      Test: {p.lastTestStatus}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  <span className="font-semibold">{p.modelName}</span> · {p.apiBaseUrl}{p.apiEndpoint}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                  <Key className="w-3 h-3" />
                                  <span>{p.keyMasked}</span>
                                  <span>· max {p.maxOutputTokens} tok</span>
                                  <span>· temp {p.temperature}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleTestProvider(p.id)}
                                  disabled={busy}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                >
                                  Test
                                </button>
                                {!p.isDefault && (
                                  <button
                                    onClick={() => handleSetDefaultProvider(p.id)}
                                    disabled={busy}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold"
                                  >
                                    Set Default
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingProviderId(p.id);
                                    setProviderForm({
                                      name: p.name,
                                      providerType: p.providerType,
                                      apiBaseUrl: p.apiBaseUrl,
                                      apiEndpoint: p.apiEndpoint,
                                      apiKey: '',
                                      modelName: p.modelName,
                                      maxOutputTokens: p.maxOutputTokens,
                                      temperature: p.temperature,
                                      timeoutMs: p.timeoutMs,
                                      supportsJsonMode: p.supportsJsonMode,
                                      customHeadersJson: p.customHeadersJson || '',
                                      isActive: p.isActive,
                                      isDefault: p.isDefault,
                                    });
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProvider(p.id)}
                                  disabled={busy}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700"
                                  title="Delete Provider"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Stored Job Token Usage History */}
                    {aiUsage?.recentJobs?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                          Stored Processing Token Log (Zero AI Calls on View)
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/70 text-[10px] uppercase text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="p-3">Material</th>
                                <th className="p-3">Provider / Model</th>
                                <th className="p-3">Tokens</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {aiUsage.recentJobs.map((j: any) => (
                                <tr key={j.id}>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900">{j.materialTitle} (v{j.pdfVersion})</div>
                                    <div className="text-[10px] text-slate-500">
                                      {j.isRegeneration ? `Regen: ${j.regenerationScope}` : 'Initial One-Time Processing'}
                                    </div>
                                  </td>
                                  <td className="p-3 text-[11px] text-slate-700">
                                    {j.providerName} · {j.modelName}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-800">
                                    {(j.totalTokens || 0).toLocaleString()}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(j.status)}`}>
                                      {j.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add / Edit Provider Form */}
                  <div className="lg:col-span-5">
                    <form onSubmit={handleSaveProvider} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-sm text-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-[#073832]">
                          {editingProviderId ? 'Edit AI Provider' : 'Add OpenAI-Compatible Provider'}
                        </h3>
                        {editingProviderId && (
                          <button
                            type="button"
                            onClick={() => setEditingProviderId(null)}
                            className="text-slate-500 hover:text-slate-800 font-bold"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Provider Name *</label>
                        <input
                          required
                          value={providerForm.name}
                          onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                          placeholder="e.g. OpenAI GPT-4o Mini, OpenRouter, Ollama Local"
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">API Base URL *</label>
                          <input
                            required
                            value={providerForm.apiBaseUrl}
                            onChange={(e) => setProviderForm({ ...providerForm, apiBaseUrl: e.target.value })}
                            placeholder="https://api.openai.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Endpoint Path</label>
                          <input
                            value={providerForm.apiEndpoint}
                            onChange={(e) => setProviderForm({ ...providerForm, apiEndpoint: e.target.value })}
                            placeholder="/v1/chat/completions"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Model Name *</label>
                          <input
                            required
                            value={providerForm.modelName}
                            onChange={(e) => setProviderForm({ ...providerForm, modelName: e.target.value })}
                            placeholder="gpt-4o-mini"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            API Key {editingProviderId ? '(blank keeps current)' : ''}
                          </label>
                          <input
                            type="password"
                            value={providerForm.apiKey}
                            onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Max Tokens</label>
                          <input
                            type="number"
                            value={providerForm.maxOutputTokens}
                            onChange={(e) => setProviderForm({ ...providerForm, maxOutputTokens: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Temp</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={providerForm.temperature}
                            onChange={(e) => setProviderForm({ ...providerForm, temperature: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Timeout (ms)</label>
                          <input
                            type="number"
                            value={providerForm.timeoutMs}
                            onChange={(e) => setProviderForm({ ...providerForm, timeoutMs: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Custom Headers JSON (Optional)</label>
                        <input
                          value={providerForm.customHeadersJson}
                          onChange={(e) => setProviderForm({ ...providerForm, customHeadersJson: e.target.value })}
                          placeholder='{"HTTP-Referer": "https://clinic.edu.gh"}'
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={providerForm.supportsJsonMode}
                            onChange={(e) => setProviderForm({ ...providerForm, supportsJsonMode: e.target.checked })}
                          />
                          <span>Supports JSON Mode</span>
                        </label>
                        <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={providerForm.isActive}
                            onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                          />
                          <span>Active</span>
                        </label>
                        <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={providerForm.isDefault}
                            onChange={(e) => setProviderForm({ ...providerForm, isDefault: e.target.checked })}
                          />
                          <span>Set as Default</span>
                        </label>
                      </div>

                      {providerTestResult && (
                        <div className={`p-3 rounded-xl text-[11px] font-semibold ${providerTestResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {providerTestResult.message}
                          {providerTestResult.latencyMs ? ` (${providerTestResult.latencyMs}ms)` : ''}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleTestProvider()}
                          disabled={busy}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                        >
                          Test Connection
                        </button>
                        <button
                          type="submit"
                          disabled={busy}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-[#073832] hover:bg-[#0a4c44] text-white font-bold"
                        >
                          {editingProviderId ? 'Update Provider' : 'Save Provider'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: CONTROLLED AI REGENERATION CONFIRMATION */}
      {regenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold">Confirm AI Regeneration</h3>
              </div>
              <button onClick={() => setRegenModal(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to regenerate AI content for <strong className="text-slate-900">{regenModal.materialTitle}</strong>. This will make a new AI provider request and consume API tokens/credits.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">
              Approved/published questions and student assessment history are always preserved. Only unapproved draft questions are replaced when regenerating questions.
            </div>
            <div className="text-xs">
              <label className="font-bold text-slate-700 block mb-1.5">Regeneration Scope</label>
              <select
                value={regenModal.scope}
                onChange={(e) =>
                  setRegenModal({
                    ...regenModal,
                    scope: e.target.value as 'TOPICS' | 'NOTES' | 'QUESTIONS' | 'ALL',
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
              >
                <option value="ALL">ALL — Topics, Study Notes &amp; Draft Questions</option>
                <option value="TOPICS">TOPICS — Re-extract Topics &amp; Subtopics</option>
                <option value="NOTES">NOTES — Regenerate Structured Study Notes</option>
                <option value="QUESTIONS">QUESTIONS — Regenerate Draft Questions Only</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegenModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmRegenerate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                {busy ? 'Regenerating...' : 'Confirm & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD COURSE PDF */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUploadPdf} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#073832]">Upload Course PDF Material</h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">PDF File (Max 25 MB)</label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
                      setUploadFile(f);
                    } else if (f) {
                      notify('Only PDF files are supported.', 'err');
                    }
                  }}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 cursor-pointer transition text-center ${
                    dragOver
                      ? 'border-emerald-500 bg-emerald-50'
                      : uploadFile
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60'
                  }`}
                >
                  <Upload className="w-6 h-6 text-emerald-700 mb-1.5" />
                  <span className="font-bold text-slate-800">
                    {uploadFile ? uploadFile.name : 'Drag & drop your course PDF here, or click to browse'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    {uploadFile
                      ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload & extract topics`
                      : 'Selectable text PDFs are automatically indexed page-by-page'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g. Fundamentals of Nursing — Module 1 Handout"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Course</label>
                  <select
                    required
                    value={uploadForm.courseId}
                    onChange={(e) => {
                      const c = courses.find((item) => item.id === e.target.value);
                      setUploadForm({
                        ...uploadForm,
                        courseId: e.target.value,
                        programmeId: c?.programmeId || '',
                        level: c?.level || 'Level 100',
                        semester: c?.semester || 'First Semester',
                      });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Academic Level</label>
                  <select
                    value={uploadForm.level}
                    onChange={(e) => setUploadForm({ ...uploadForm, level: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="Level 100">Level 100</option>
                    <option value="Level 200">Level 200</option>
                    <option value="Level 300">Level 300</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Optional overview of chapters covered..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#073832] hover:bg-emerald-900">
                {busy ? 'Uploading & Extracting Topics...' : 'Upload & Extract Topics'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GENERATE QUESTIONS FOR TOPIC */}
      {genTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleGenerateQuestions} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#073832]">Generate Topic Questions</h3>
              <button type="button" onClick={() => setGenTopic(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Generating questions strictly from: <span className="font-bold text-emerald-800">{genTopic.title}</span> (pp. {genTopic.pageStart}–{genTopic.pageEnd})
            </p>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={genForm.count}
                    onChange={(e) => setGenForm({ ...genForm, count: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={genForm.difficulty}
                    onChange={(e) => setGenForm({ ...genForm, difficulty: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="DIFFICULT">Difficult</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Question Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['MCQ', 'Multiple Choice'],
                    ['TRUE_FALSE', 'True / False'],
                    ['SHORT_ANSWER', 'Short Answer'],
                    ['FILL_BLANK', 'Fill in Blanks'],
                    ['MATCHING', 'Matching Pairs'],
                    ['SCENARIO', 'Clinical Scenario'],
                  ].map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genForm.questionTypes.includes(val)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...genForm.questionTypes, val]
                            : genForm.questionTypes.filter((t) => t !== val);
                          setGenForm({ ...genForm, questionTypes: next });
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setGenTopic(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                {busy ? 'Generating...' : 'Generate Draft Questions'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT TOPIC */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveTopicEdit} className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#073832]">Edit Extracted Topic</h3>
              <button type="button" onClick={() => setEditingTopic(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Topic Title</label>
                <input
                  type="text"
                  required
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Page Start</label>
                  <input
                    type="number"
                    value={editingTopic.pageStart}
                    onChange={(e) => setEditingTopic({ ...editingTopic, pageStart: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Page End</label>
                  <input
                    type="number"
                    value={editingTopic.pageEnd}
                    onChange={(e) => setEditingTopic({ ...editingTopic, pageEnd: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingTopic.description || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Text Content</label>
                <textarea
                  rows={5}
                  value={editingTopic.rawText || ''}
                  onChange={(e) => setEditingTopic({ ...editingTopic, rawText: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTopic(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD MANUAL TOPIC */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddManualTopic} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#073832]">Add Topic Manually</h3>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Topic Title"
                value={newTopicForm.title}
                onChange={(e) => setNewTopicForm({ ...newTopicForm, title: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <textarea
                rows={3}
                placeholder="Topic Description"
                value={newTopicForm.description}
                onChange={(e) => setNewTopicForm({ ...newTopicForm, description: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Page Start"
                  value={newTopicForm.pageStart}
                  onChange={(e) => setNewTopicForm({ ...newTopicForm, pageStart: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Page End"
                  value={newTopicForm.pageEnd}
                  onChange={(e) => setNewTopicForm({ ...newTopicForm, pageEnd: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddTopicModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                Add Topic
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EDIT QUESTION */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveQuestionEdit} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#073832]">Edit Question</h3>
            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                value={editingQuestion.questionText}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <input
                type="text"
                value={editingQuestion.correctAnswer}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                placeholder="Correct Answer"
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                placeholder="Explanation"
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={editingQuestion.difficulty}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                  className="border border-slate-200 rounded-xl px-2 py-2 bg-white"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="DIFFICULT">Difficult</option>
                </select>
                <input
                  type="number"
                  value={editingQuestion.marks}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                  className="border border-slate-200 rounded-xl px-2 py-2"
                />
                <select
                  value={editingQuestion.status}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, status: e.target.value })}
                  className="border border-slate-200 rounded-xl px-2 py-2 bg-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingQuestion(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                Save Question
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE TOPIC ASSESSMENT */}
      {showCreateAssessment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAssessment} className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#073832]">Create Topic Assessment</h3>
            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Assessment Title (e.g. Vital Signs Mastery Quiz)"
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={assessmentForm.courseId}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, courseId: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
                <select
                  value={assessmentForm.assessmentType}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, assessmentType: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="TOPIC_QUIZ">Topic Quiz</option>
                  <option value="COURSE_ASSESSMENT">Course Assessment</option>
                  <option value="REVISION_TEST">Revision Test</option>
                  <option value="PRACTICE_EXAM">Practice Examination</option>
                  <option value="TIMED_ASSESSMENT">Timed Assessment</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Topic (Optional — leave blank for whole course)</label>
                <select
                  value={assessmentForm.topicId}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, topicId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">All Topics in Course</option>
                  {selectedMaterial?.extractedTopics?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    value={assessmentForm.durationMinutes}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, durationMinutes: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pass Mark (%)</label>
                  <input
                    type="number"
                    value={assessmentForm.passMark}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, passMark: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Questions Count</label>
                  <input
                    type="number"
                    value={assessmentForm.randomCount}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, randomCount: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateAssessment(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                Create &amp; Publish Assessment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL GRADING OF SHORT ANSWER ATTEMPT */}
      {gradingAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmitManualGrades} className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#073832]">
                Review &amp; Grade Attempt — {gradingAttempt.attempt.studentName}
              </h3>
              <button type="button" onClick={() => setGradingAttempt(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              {gradingAttempt.attempt.answers?.map((ans: any, idx: number) => (
                <div key={ans.id} className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900">
                    Q{idx + 1} ({ans.question?.questionType} · {ans.maxMarks} marks): {ans.question?.questionText}
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="font-bold text-slate-600">Student Answer:</span>{' '}
                    {ans.answerText || ans.selectedOption || '(No answer)'}
                  </div>
                  {ans.question?.questionType === 'SHORT_ANSWER' ? (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                      <div className="text-[11px] text-amber-900">
                        <span className="font-bold">Marking Guide:</span> {ans.question?.markingGuide || ans.question?.correctAnswer}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min={0}
                          max={ans.maxMarks}
                          step={0.5}
                          value={gradeInputs[ans.id]?.marksAwarded ?? 0}
                          onChange={(e) =>
                            setGradeInputs({
                              ...gradeInputs,
                              [ans.id]: {
                                ...(gradeInputs[ans.id] || { feedback: '' }),
                                marksAwarded: Number(e.target.value),
                              },
                            })
                          }
                          className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                          placeholder="Marks"
                        />
                        <input
                          type="text"
                          value={gradeInputs[ans.id]?.feedback ?? ''}
                          onChange={(e) =>
                            setGradeInputs({
                              ...gradeInputs,
                              [ans.id]: {
                                ...(gradeInputs[ans.id] || { marksAwarded: 0 }),
                                feedback: e.target.value,
                              },
                            })
                          }
                          className="col-span-2 border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                          placeholder="Feedback for student"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-emerald-700">
                      Auto-graded: {ans.marksAwarded}/{ans.maxMarks} marks
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setGradingAttempt(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl text-xs font-bold bg-[#073832] text-white">
                Save Manual Grades
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

