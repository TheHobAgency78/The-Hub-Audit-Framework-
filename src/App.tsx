/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClientDataInput, AuditReport } from './types';
import ClientForm from './components/ClientForm';
import AuditResultView from './components/AuditResultView';
import ComparisonView from './components/ComparisonView';
import { PRESET_CLIENTS } from './components/presets';
import { 
  Briefcase, 
  Settings, 
  HelpCircle, 
  Plus, 
  FolderOpen, 
  BarChart, 
  Activity, 
  Moon, 
  LayoutDashboard,
  Trash2,
  FileText,
  AlertTriangle,
  Award,
  BookOpen
} from 'lucide-react';

const SAVED_AUDITS_KEY = 'the_hub_v1_saved_audits';

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'reports' | 'compare'>('create');
  const [savedAudits, setSavedAudits] = useState<AuditReport[]>([]);
  const [currentReport, setCurrentReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sharedLoading, setSharedLoading] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sharedError, setSharedError] = useState<string | null>(null);

  // Check for shared report ID in URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share') || params.get('reportId');
    if (shareId) {
      setSharedLoading(true);
      setErrorMessage(null);
      fetch(`/api/share/${shareId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('التقرير المطلوب غير موجود على خادم THE HUB أو انتهت صلاحية الرابط.');
          }
          return res.json();
        })
        .then((data) => {
          setCurrentReport(data);
          setActiveTab('reports');
          // Save to local audits if not already present
          setSavedAudits((prev) => {
            if (prev.some((a) => a.id === data.id)) return prev;
            const updated = [data, ...prev];
            localStorage.setItem(SAVED_AUDITS_KEY, JSON.stringify(updated));
            return updated;
          });
        })
        .catch((err) => {
          console.error('Error fetching shared report:', err);
          setSharedError(err.message || 'فشل تحميل التقرير المشترك.');
        })
        .finally(() => {
          setSharedLoading(false);
        });
    }
  }, []);

  // Rotation index for loading screens simulation logs
  const simulationLogs = [
    'جاري فك تشفير مدخلات العميل وربطها بقنوات التسييل والوصول المتاحة...',
    'محاكاة معايير أول 3 ثوانٍ خوارزمياً وتقييم Hook Rate...',
    'تحليل معدل إكمال الفيديو (Watch Time Completion) لجمهور القطاع...',
    'جرد نسبة الحفظ والمشاركة وتقييم مستويات ضياع النمو المتلقى الرديء...',
    'محاكاة معايير فحص V1 وإخضاع الحساب لعقبات THE HUB الحادة...',
    'ترسيم وتنسيق الخدمات الست لوكالة THE HUB لتغطية العجز المكتشف...'
  ];

  // Load Saved Audits on startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_AUDITS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuditReport[];
        setSavedAudits(parsed);
        if (parsed.length > 0) {
          setCurrentReport(parsed[0]); // Select latest by default
        }
      }
    } catch (e) {
      console.error('Error loading audits from storage:', e);
    }
  }, []);

  // Set rotating simulator logs during loading
  useEffect(() => {
    let logInterval: any;
    if (loading) {
      let cursor = 0;
      setLoadingLogs(simulationLogs[0]);
      logInterval = setInterval(() => {
        cursor = (cursor + 1) % simulationLogs.length;
        setLoadingLogs(simulationLogs[cursor]);
      }, 4000);
    }
    return () => clearInterval(logInterval);
  }, [loading]);

  const handleAuditSubmit = async (inputData: ClientDataInput) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'فشلت معالجة الفحص الخوارزمي.');
      }

      const generatedReport = await response.json() as AuditReport;

      // Persist results
      const updatedAudits = [generatedReport, ...savedAudits];
      setSavedAudits(updatedAudits);
      localStorage.setItem(SAVED_AUDITS_KEY, JSON.stringify(updatedAudits));
      
      setCurrentReport(generatedReport);
      setActiveTab('reports'); // Switch instantly to preview the generated report!
    } catch (error: any) {
      console.error('Audit failed:', error);
      setErrorMessage(error.message || 'حدث خطأ غير متوقع أثناء معالجة بيانات العميل مع نموذج الذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAudit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAudits.filter(a => a.id !== id);
    setSavedAudits(updated);
    localStorage.setItem(SAVED_AUDITS_KEY, JSON.stringify(updated));

    if (currentReport?.id === id) {
      setCurrentReport(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <div className="min-h-screen bg-hub-bg text-gray-100 flex flex-col font-sans selection:bg-hub-accent selection:text-white" id="main_app_wrapper">
      
      {/* 1. TOP HEADER BRAND BAR */}
      <header className="border-b border-hub-border bg-hub-card/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo element mapping RTL/Arabic */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-hub-accent rounded-xl flex items-center justify-center font-black text-white text-lg tracking-wider select-none shadow-lg shadow-hub-accent/10">
              H
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-widest text-white">THE HUB</span>
                <span className="w-1.5 h-1.5 bg-hub-gold-light rounded-full" />
              </div>
              <span className="text-[10px] text-gray-400 font-bold block leading-none">مستشار النمو والرشد الرقمي المشفر</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1" id="nav-tabs">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold pb-2 pt-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-hub-accent text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              محلل فحص جديد V1
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold pb-2 pt-2 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-hub-accent text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              التقارير المولدة ({savedAudits.length})
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold pb-2 pt-2 transition-all cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-hub-accent text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              لوحة مقارنة الحسابات
            </button>
          </nav>

          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-2 text-xs bg-hub-bg border border-hub-border/60 rounded-full py-1 px-3">
            <Activity className="w-3.5 h-3.5 text-hub-emerald animate-pulse" />
            <span className="text-gray-400 text-[10px] font-bold">نسخة الإطار V1 تشغيلية</span>
          </div>

        </div>
      </header>

      {/* 2. SUB HEADER BANNER AREA (Except Print) */}
      <div className="bg-gradient-to-b from-hub-card to-hub-bg py-8 px-4 sm:px-6 lg:px-8 border-b border-hub-border/50 no-print">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="text-[10px] bg-hub-gold/10 text-hub-gold-light font-black tracking-widest px-3 py-1 rounded-full uppercase border border-hub-gold/20 select-none">
            إطار معالجة الخوارزميات وتدفق الوصول المالي للعلامات تجارياً
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            الفحص الأول خوارزمياً لقصم تطلعات حسابات العملاء
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto leading-relaxed">
            لا تهاون ولا مجاملة. فكك حساب عميلك بالأرقام، واعثر على ثغرات النشر وفجوة ثقة الجمهور خوارزمياً، ثم وجه مبيعات الوكالة لمعالجة العجز الفوري.
          </p>
        </div>
      </div>

      {/* 3. MAIN WORKPLACE LAYOUT */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative">
        
        {/* API key Error callout */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-hub-rose/10 border border-hub-rose/30 rounded-xl text-xs text-hub-rose flex items-start gap-3 relative overflow-hidden animate-shake" id="api_error_banner">
            <div className="absolute top-0 right-0 w-1 h-full bg-hub-rose" />
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold">فشل إكمال الفحص الرقمي</h4>
              <p className="text-gray-400 leading-relaxed">{errorMessage}</p>
              <div className="pt-2 text-[10px] text-gray-500">
                يرجى التأكد من إدخال مفتاح <strong>GEMINI_API_KEY</strong> في لوحة <strong>Settings &gt; Secrets</strong> في واجهة AI Studio وتحديث الصفحة.
              </div>
            </div>
          </div>
        )}

        {/* SHARED REPORT LOADING STATE */}
        {sharedLoading && (
          <div className="fixed inset-0 z-50 bg-[#0A0B0E] flex flex-col items-center justify-center p-6 backdrop-blur-md" id="shared_loading_overlay">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-hub-gold/10" />
                <div className="absolute inset-0 rounded-full border-4 border-hub-gold border-t-transparent animate-spin" />
                <div className="absolute inset-4 rounded-xl bg-hub-card flex items-center justify-center">
                  <Award className="w-6 h-6 text-hub-gold-light animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-black text-white">جاري مزامنة وتحميل التقرير المشترك...</h3>
                <p className="text-xs text-gray-500 font-mono">THE HUB ALGORITHMIC SHIELD</p>
              </div>
            </div>
          </div>
        )}

        {/* Shared Link Loading Error */}
        {sharedError && (
          <div className="mb-6 p-4 bg-hub-rose/10 border border-hub-rose/30 rounded-xl text-xs text-hub-rose flex items-start gap-3 relative overflow-hidden animate-shake" id="shared_error_banner">
            <div className="absolute top-0 right-0 w-1 h-full bg-hub-rose" />
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold">رابط مشاركة غير صالح أو مفقود</h4>
              <p className="text-gray-400 leading-relaxed">{sharedError}</p>
              <button 
                type="button"
                onClick={() => { setSharedError(null); window.history.replaceState({}, '', '/'); }}
                className="mt-2 text-[11px] text-hub-gold hover:underline font-bold"
              >
                العودة للرئيسية وإجراء فحص جديد
              </button>
            </div>
          </div>
        )}

        {/* LOADING ANIMATED SCREEN SIMULATOR */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-hub-bg/95 flex flex-col items-center justify-center p-6 backdrop-blur-sm" id="loading_overlay">
            <div className="max-w-md w-full text-center space-y-6">
              
              {/* Dynamic spinning core widget */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-hub-accent/10" />
                <div className="absolute inset-0 rounded-full border-4 border-hub-accent border-t-transparent animate-spin" />
                <div className="absolute inset-4 rounded-xl bg-hub-card flex items-center justify-center">
                  <Activity className="w-6 h-6 text-hub-gold-light animate-pulse" />
                </div>
              </div>

              {/* Status feedback log */}
              <div className="space-y-2">
                <h3 className="text-sm font-black text-white">جاري تحليل وفحص الحساب...</h3>
                <p className="text-xs text-gray-400 animate-pulse font-mono max-w-xs mx-auto min-h-[32px] leading-relaxed">
                  {loadingLogs}
                </p>
              </div>

              {/* Informational advice */}
              <div className="p-3 bg-hub-card border border-hub-border rounded-xl text-[10px] text-gray-500 text-right leading-relaxed">
                <span className="font-bold text-gray-300 block mb-1">معلومة خوارزمية:</span>
                نقوم بمطابقة أرقامك المدخلة مع محركات تيك توك وإنستغرام ريلز للتدفق الاستنتاجي. يتخذ النموذج قرارات حاسمة بناء على إطار THE HUB V1.
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: CREATE AUDIT */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="create_tab_view">
            {/* Form component */}
            <div className="col-span-1 lg:col-span-9">
              <ClientForm onSubmit={handleAuditSubmit} isLoading={loading} />
            </div>

            {/* Right sidebar showing saved client list */}
            <div className="col-span-1 lg:col-span-3 space-y-4 no-print" id="saved_sidebar">
              <div className="bg-hub-card border border-hub-border rounded-xl p-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5 mb-3 pb-2 border-b border-hub-border">
                  <FolderOpen className="w-4 h-4 text-hub-gold-light" />
                  أرشيف الحسابات المفحوصة مؤخراً
                </h3>

                {savedAudits.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 space-y-2">
                    <FileText className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-[11px] leading-relaxed">لا توجد حسابات مفحوصة في الأرشيف المحلي حالياً.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {savedAudits.map((audit) => (
                      <div
                        key={audit.id}
                        onClick={() => {
                          setCurrentReport(audit);
                          setActiveTab('reports');
                        }}
                        className="p-2.5 rounded-lg bg-hub-bg hover:bg-black/35 border border-hub-border hover:border-hub-accent/40 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1 pl-2 text-right">
                          <span className="text-[11px] font-bold text-white block truncate">{audit.inputData.clientName}</span>
                          <span className="text-[9px] text-gray-400 block truncate">{audit.inputData.niche}</span>
                          <span className="text-[9px] text-hub-accent font-black block mt-0.5">HUB SCORE: {audit.hubScore}</span>
                        </div>
                        
                        <button
                          onClick={(e) => deleteAudit(audit.id, e)}
                          className="p-1 px-2 rounded hover:bg-hub-rose/10 text-gray-600 hover:text-hub-rose transition-all cursor-pointer"
                          title="حذف من الأرشيف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strategic Agency guidelines side widget */}
              <div className="bg-hub-card border border-hub-border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-hub-accent" />
                  دليل مبيعات THE HUB V1:
                </h4>
                <p className="text-[11px] text-gray-300 leading-relaxed text-right">
                  الهدف من الفحص ليس ملء الحقول؛ بل كشف عقم جهود تسويق العميل الفردية. عندما تحدد <strong>الاختناق الأول</strong> بالتقرير، اربطه مباشرة في العرض بخدمات <strong>إنتاج الفيديو المتكامل</strong> أو <strong>بناء مسارات البيع</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT REPORTS VIEW */}
        {activeTab === 'reports' && (
          <div id="reports_tab_view">
            {currentReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Reports visual navigation sidebar */}
                <div className="col-span-1 lg:col-span-3 bg-hub-card border border-hub-border rounded-xl p-4 no-print">
                  <h3 className="text-xs font-black text-white pb-2 mb-3 border-b border-hub-border">اختر التقرير لمعاينته:</h3>
                  {savedAudits.length === 0 ? (
                    <p className="text-xs text-gray-500">لا توجد تقارير منشأة حالياً.</p>
                  ) : (
                    <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
                      {savedAudits.map((audit) => (
                        <button
                          key={audit.id}
                          onClick={() => setCurrentReport(audit)}
                          className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                            currentReport.id === audit.id
                              ? 'bg-hub-accent/15 border border-hub-accent/40 text-white font-bold'
                              : 'text-gray-400 hover:bg-hub-bg/60 border border-transparent'
                          }`}
                        >
                          <span className="truncate flex-1 pl-2">{audit.inputData.clientName}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-hub-gold-light">{audit.hubScore}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-hub-border">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="w-full py-2 bg-hub-accent hover:bg-hub-accent-hover text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إنشاء فحص جديد
                    </button>
                  </div>
                </div>

                {/* Main analytical result presentation representation */}
                <div className="col-span-1 lg:col-span-9">
                  <AuditResultView report={currentReport} savedAudits={savedAudits} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-hub-card border border-hub-border rounded-lg max-w-md mx-auto space-y-4 shadow-xl">
                <LayoutDashboard className="w-12 h-12 text-gray-500 mx-auto animate-bounce" />
                <h3 className="text-sm font-black text-white">لم يتم إنشاء أي تقرير بعد</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  الرجاء الانتقال إلى علامة تبويب <strong>"محلل فحص جديد V1"</strong> وتعبئة المؤشرات لإصدار تقرير الفحص المعتمد الفوري.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-5 py-2 bg-hub-accent hover:bg-hub-accent-hover text-white text-xs font-black rounded-lg cursor-pointer transition-all"
                  >
                    أطلق الفحص الأول للعميل
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT COMPARISON */}
        {activeTab === 'compare' && (
          <div id="compare_tab_view">
            <ComparisonView savedAudits={savedAudits} />
          </div>
        )}

      </main>

      {/* 4. FOOTER AREA */}
      <footer className="border-t border-hub-border bg-hub-card py-6 mt-12 text-center text-xs text-gray-500 no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold">مستند الفحص الخوارزمي والتجاري المتقدم — وكالة THE HUB © 2026</p>
          <p className="text-[10px] text-gray-600 max-w-lg mx-auto leading-relaxed">
            تخضع منصة التدقيق هذه للسرية التامة للوكالة الحاضنة. تم تصنيف وتحليل مصلحة محركات النشر بناء على براءات خوارزميات TikTok, Meta, YouTube الحديثة لعام 2026.
          </p>
        </div>
      </footer>

    </div>
  );
}
