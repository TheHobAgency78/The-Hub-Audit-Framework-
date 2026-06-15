/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AuditReport, CriticalBottleneck, UntappedOpportunity, QuickWin, RecommendedService, MonthPlan } from '../types';
import { 
  ClipboardCheck, 
  Gauge, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle, 
  Zap, 
  CalendarDays, 
  Briefcase, 
  Copy, 
  Check, 
  Printer, 
  Share2,
  Lock,
  Hourglass,
  BadgeAlert,
  Coins,
  TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface AuditResultViewProps {
  report: AuditReport;
  savedAudits?: AuditReport[];
}

export default function AuditResultView({ report, savedAudits }: AuditResultViewProps) {
  const [activeTab, setActiveTab] = useState<number>(1); // Default to Hub Score
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Sharing & Simplified Image states
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [generatingSimpleCard, setGeneratingSimpleCard] = useState<boolean>(false);
  const [reportShareUrl, setReportShareUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [simpleCardImg, setSimpleCardImg] = useState<string>('');

  const triggerToast = (type: 'success' | 'error' | 'info', message: string) => {
    setPdfToast({ type, message });
    setTimeout(() => {
      setPdfToast(null);
    }, 4000);
  };

  const getShareLink = async (): Promise<string> => {
    if (reportShareUrl) return reportShareUrl;
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate shared link on server.');
      }
      const data = await response.json();
      const finalUrl = `${window.location.origin}/?share=${data.shareId}`;
      setReportShareUrl(finalUrl);
      return finalUrl;
    } catch (err) {
      console.error('Error generating share link:', err);
      const fallbackUrl = `${window.location.origin}/?reportId=${report.id}`;
      setReportShareUrl(fallbackUrl);
      return fallbackUrl;
    }
  };

  const generateSimplifiedImage = async () => {
    setGeneratingSimpleCard(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = document.getElementById('export-simple-card-wrapper');
      if (!element) {
        throw new Error('Simplified image elements are missing in DOM.');
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0A0B0E',
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSimpleCardImg(dataUrl);
    } catch (err) {
      console.error('Failed to generate simple card image:', err);
    } finally {
      setGeneratingSimpleCard(false);
    }
  };

  const copyShareLink = async () => {
    try {
      const url = await getShareLink();
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      triggerToast('success', 'تم نسخ رابط التقرير الفريد بنجاح!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const downloadSimpleImage = () => {
    if (!simpleCardImg) return;
    const safeName = (report.inputData.clientName || 'Client').trim().replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.href = simpleCardImg;
    link.download = `THE_HUB_ملخص_${safeName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('success', 'تم تحميل التقرير كصورة بنجاح!');
  };

  const exportToPDF = async () => {
    setExportingPDF(true);
    triggerToast('info', 'جاري الآن إنتاج صفحات التقرير الفاخر بدقة عالية... برجاء الانتظار ثوانٍ معدودة.');
    try {
      const element = document.getElementById('export-pdf-wrapper');
      if (!element) {
        throw new Error('لم يتم العثور على حاوية تصدير PDF.');
      }

      const opt = {
        scale: 2, // Capture high-resolution quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0A0B0E',
        logging: false,
      };

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      const docWidth = pdf.internal.pageSize.getWidth(); // A4: ~210mm
      const docHeight = pdf.internal.pageSize.getHeight(); // A4: ~297mm

      const pages = element.querySelectorAll('.pdf-page');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, opt);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, docWidth, docHeight);
      }

      const safeName = (report.inputData.clientName || 'Client').trim().replace(/\s+/g, '_');
      
      // Use modern blob download wrapper to prevent sandbox/iframe redirect blocks safely
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `تخطيط_تحريري_THE_HUB_V1_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      triggerToast('success', 'تم تصنيع وتنزيل مستند PDF الفاخر بنجاح عالي!');
    } catch (err: any) {
      console.error('PDF Export failed:', err);
      triggerToast('error', 'فشل تصدير التقرير الفاخر إلى PDF: ' + (err.message || 'خطأ فني غير معروف.'));
    } finally {
      setExportingPDF(false);
    }
  };

  // Filter saved audits belonging to this client to show progress
  const clientAudits = (savedAudits || [])
    .filter(a => a.inputData && a.inputData.clientName && report.inputData && a.inputData.clientName.trim().toLowerCase() === report.inputData.clientName.trim().toLowerCase())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate historical trend data
  let chartData = clientAudits.map((audit, i) => {
    const dateObj = new Date(audit.timestamp);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    return {
      name: dateStr,
      score: audit.hubScore,
      confidence: audit.confidenceScore,
      fullDate: dateObj.toLocaleString('ar-EG'),
      label: `فحص رقم ${i + 1}`
    };
  });

  // If there's only 1 audit, let's add simulated preceding benchmarks to show how they would progress and look beautifully interactive!
  if (chartData.length <= 1) {
    const currentScore = report.hubScore;
    chartData = [
      {
        name: 'قبل شهرين',
        score: Math.max(15, currentScore - 18),
        confidence: Math.max(15, report.confidenceScore - 15),
        fullDate: 'التقييم الأولي التقريبي قبل ٦٠ يوماً',
        label: 'نقطة الانطلاق'
      },
      {
        name: 'قبل شهر',
        score: Math.max(25, currentScore - 9),
        confidence: Math.max(25, report.confidenceScore - 5),
        fullDate: 'تقصي الأثر الفني قبل ٣٠ يوماً',
        label: 'تحليل تراجع الأداء'
      },
      {
        name: 'فحص اليوم',
        score: currentScore,
        confidence: report.confidenceScore,
        fullDate: new Date(report.timestamp).toLocaleString('ar-EG'),
        label: 'الفحص المباشر الحاد'
      }
    ];
  }

  const formatPlatform = (p: string) => {
    switch (p) {
      case 'instagram': return 'إنستغرام ريلز (Instagram)';
      case 'tiktok': return 'تيك توك (TikTok)';
      case 'youtube_shorts': return 'يوتيوب شورتس (YouTube Shorts)';
      case 'x': return 'منصة إكس (X / Twitter)';
      default: return 'كل المنصات كحزمة متكاملة';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-hub-emerald bg-hub-emerald/10 border-hub-emerald/30';
    if (score >= 50) return 'text-hub-gold-light bg-hub-gold/10 border-hub-gold/30';
    return 'text-hub-rose bg-hub-rose/10 border-hub-rose/30';
  };

  const generateMarkdownReport = (): string => {
    let md = `# تقرير الفحص الخوارزمي والتجاري المتقدم (THE HUB V1)
**اسم العميل:** ${report.inputData.clientName}
**النشاط التجاري:** ${report.inputData.niche}
**المنصة المستهدفة:** ${formatPlatform(report.inputData.platform)}
**التاريخ:** ${new Date(report.timestamp).toLocaleDateString('ar-EG')}
**HUB SCORE:** ${report.hubScore}/100
**درجة ثقة البيانات:** ${report.confidenceScore}/100

=========================================

### المرحلة 0 - تقييم موثوقية البيانات:
* **درجة الثقة:** ${report.confidenceScore}%
* **البيانات الهامة الناقصة:**
${report.missingDataPoints.map(p => `  - ${p}`).join('\n')}
* **الافتراضات المعتمدة:**
${report.assumptions.map(a => `  - ${a}`).join('\n')}

=========================================

### المرحلة 1 - تقييم كفاءة محرك النمو (HUB SCORE):
إجمالي التقييم: ${report.hubScore}/100
${report.dimensions.map(d => `* **${d.name}:** [${d.score}/10]\n  - تحليل: ${d.analysis}`).join('\n\n')}

=========================================

### المرحلة 2 - المشاكل والاختناقات الحرجة (10 نقاط جافة):
${report.bottlenecks.map(b => `${b.rank}. **${b.title}**
   - الشرح: ${b.description}
   - الأثر على الخوارزمية: ${b.algorithmicImpact}
   - الأثر المالي والتجاري: ${b.commercialImpact}`).join('\n\n')}

=========================================

### المرحلة 3 - الفرص الكامنة غير المستغلة:
${report.opportunities.map(o => `* **${o.title}**
   - لماذا تعتبر فرصة: ${o.rationale}
   - العائد الرقمي المتوقع: ${o.expectedDigitalReturn}
   - العائد المالي المتوقع: ${o.expectedCommercialReturn}
   - سهولة التنفيذ: ${o.easeOfImplementation}`).join('\n\n')}

=========================================

### المرحلة 4 - الأسئلة الاستراتيجية للاجتماع البيعي:
${report.strategicQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

=========================================

### المرحلة 5 - Quick Wins (إجراءات سريعة لـ 30 يوماً):
${report.quickWins.map(q => `* **${q.title}**
   - تفاصيل الإجراء: ${q.description}
   - التكلفة المتوقعة: ${q.implementationCost}
   - الأثر خوارزمياً: ${q.impactLevel}
   - الوقت اللازم: ${q.timeframeDays} يوم`).join('\n\n')}

=========================================

### المرحلة 6 - خطة الـ 90 يوماً المقترحة للنمو:
${report.plan90Days.map(m => `#### الشهر ${m.month}:
- **أهداف الشهر:** ${m.objectives.join(' | ')}
- **الإجراءات الفنية:** ${m.actions.join(' | ')}
- **طريقة القياس (KPIs):** ${m.kpis.join(' | ')}`).join('\n\n')}

=========================================

### المرحلة 7 - THE HUB OPPORTUNITY (الخدمات المقترحة):
معالجة العجز الخوارزمي وتمرير خدمات الوكالة المناسبة:
${report.recommendedServices.map(s => `* **الخدمة المقترحة:** ${s.name} (المعرف: ${s.serviceId})
   - لماذا تم ترشيحها: ${s.whyApplied}
   - القيمة والمنفعة المتبادلة للعميل: ${s.expectedValue}`).join('\n\n')}

=========================================
تقرير رسمي صادر ومصمم لوكالة THE HUB V1. يمنع تداوله للعامة.
`;
    return md;
  };

  const copyFullReportToClipboard = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copyQuestionToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIndex(index);
    setTimeout(() => setCopiedQuestionIndex(null), 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  // List of tabs corresponding to the 7 main HUB output phases
  const TABS = [
    { id: 0, label: 'تقييم البيانات', phase: 'المرحلة 0', icon: ClipboardCheck },
    { id: 1, label: 'HUB SCORE', phase: 'المرحلة 1', icon: Gauge },
    { id: 2, label: 'الاختناقات الحرجة', phase: 'المرحلة 2', icon: AlertTriangle },
    { id: 3, label: 'الفرص الكامنة', phase: 'المرحلة 3', icon: Lightbulb },
    { id: 4, label: 'أسئلة الاجتماع', phase: 'المرحلة 4', icon: HelpCircle },
    { id: 5, label: 'Quick Wins', phase: 'المرحلة 5', icon: Zap },
    { id: 6, label: 'خطة 90 يوماً', phase: 'المرحلة 6', icon: CalendarDays },
    { id: 7, label: 'عروض الوكالة', phase: 'المرحلة 7', icon: Briefcase },
  ];

  return (
    <div className="space-y-6" id="audit_report_view">
      {/* HEADER CARD - COMPACT METRICS */}
      <div className="bg-hub-card border border-hub-border rounded-lg p-4 lg:p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-hub-accent/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-hub-gold/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 w-full md:w-auto" id="report_header_meta">
          <div className="p-3 bg-hub-accent/10 border border-hub-border rounded-xl">
            <ClipboardCheck className="w-8 h-8 text-hub-accent" />
          </div>
          <div>
            <span className="text-xs text-hub-gold-light font-bold">تقرير فحص V1 من المحلل التجاري</span>
            <h1 className="text-2xl font-black text-white mt-0.5">{report.inputData.clientName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-1">
              <span><strong>المجال:</strong> {report.inputData.niche || 'غير محدد'}</span>
              <span>•</span>
              <span><strong>المنصة:</strong> {formatPlatform(report.inputData.platform)}</span>
              <span>•</span>
              <span><strong>التاريخ:</strong> {new Date(report.timestamp).toLocaleString('ar-EG')}</span>
            </div>
          </div>
        </div>

        {/* Global Scores metrics visually stunning */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-end mt-4 md:mt-0 no-print" id="header_score_widgets">
          {/* HUB Score widget */}
          <div className="flex items-center gap-3 bg-hub-bg/60 border border-hub-border rounded-xl px-4 py-2.5">
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" className="stroke-hub-border stroke-[4] fill-none" />
                <circle 
                  cx="28" 
                  cy="28" 
                  r="24" 
                  className={`stroke-[4] fill-none transition-all duration-1000 ${
                    report.hubScore >= 70 ? 'stroke-hub-emerald' : report.hubScore >= 45 ? 'stroke-hub-gold-light' : 'stroke-hub-rose'
                  }`}
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - report.hubScore / 100)}
                />
              </svg>
              <span className="absolute text-sm font-black text-white">{report.hubScore}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold leading-none">THE HUB SCORE</span>
              <span className={`text-xs font-black mt-1 inline-block ${
                report.hubScore >= 70 ? 'text-hub-emerald' : report.hubScore >= 45 ? 'text-hub-gold' : 'text-hub-rose'
              }`}>
                {report.hubScore >= 70 ? 'تشغيلي حاد' : report.hubScore >= 45 ? 'تراجع خوارزمي' : 'نزيف مبيعات حرج'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareModal(true); getShareLink(); generateSimplifiedImage(); }}
              className="flex items-center gap-2 bg-[#5EC2FF]/10 text-[#5EC2FF] border border-[#5EC2FF]/30 hover:bg-[#5EC2FF]/20 px-3.5 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer"
              title="مشاركة رابط فريد للعميل أو تحميل الملخص كصورة ممتازة للمنصات"
            >
              <Share2 className="w-3.5 h-3.5" />
              مشاركة / كارت الصورة
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyFullReportToClipboard(); }}
              className="flex items-center gap-2 bg-hub-bg border border-hub-border px-3.5 py-2 text-xs rounded-lg text-gray-300 hover:text-white hover:border-hub-accent transition-all cursor-pointer"
              title="نسخ التقرير بالكامل بصيغة Markdown عالي الجودة"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-hub-emerald" />
                  تم النسخ!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  مستند نسخ النص
                </>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportToPDF(); }}
              disabled={exportingPDF}
              className={`flex items-center gap-2 bg-gradient-to-r from-hub-gold to-hub-gold-light text-[#0A0B0E] hover:brightness-110 px-3.5 py-2 text-xs rounded-lg font-black transition-all cursor-pointer ${
                exportingPDF ? 'opacity-50 cursor-not-allowed animate-pulse' : ''
              }`}
              title="تصدير ملف PDF فاخر يحتفظ بالهوية البصرية الداكنة، الرسوم البيانية والجداول"
            >
              {exportingPDF ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#0A0B0E] border-t-transparent rounded-full animate-spin" />
                  جاري بناء التقرير...
                </>
              ) : (
                <>
                  <span className="text-[10px] bg-[#0A0B0E]/10 px-1 py-0.5 rounded font-black">PDF</span>
                  تصدير PDF الفاخر
                </>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrint(); }}
              className="flex items-center gap-2 bg-hub-bg border border-hub-border px-3.5 py-2 text-xs rounded-lg text-gray-300 hover:text-white hover:border-hub-accent transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة سريعة
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED PRINTOUT PAGE HEADER (Visible ONLY during print) */}
      <div className="hidden print:block text-slate-900 border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">THE HUB V1 - تقرير الفحص الخوارزمي التجاري</h1>
        <p className="text-sm mt-1">نسخة التدقيق الداخلي للوكالات والعملاء</p>
        <div className="grid grid-cols-2 mt-4 text-xs gap-2">
          <span><strong>اسم العميل:</strong> {report.inputData.clientName}</span>
          <span><strong>النشاط بالتحديد:</strong> {report.inputData.niche}</span>
          <span><strong>المنصة الخوارزمية:</strong> {formatPlatform(report.inputData.platform)}</span>
          <span><strong>إجمالي نقاط التقييم HUB SCORE:</strong> {report.hubScore}/100</span>
        </div>
      </div>

      {/* MAIN SCREEN INTERACTIVE CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative">
        {/* TABS SIDEBAR (Interactive Navigation) */}
        <div className="col-span-1 lg:col-span-3 space-y-2 no-print" id="audit_tab_sidebar">
          <div className="bg-black/20 border border-hub-border/50 rounded-xl p-2.5">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider px-3.5 pb-2 block">مراحل الفحص السبعة:</span>
            {TABS.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between text-right px-3.5 py-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-hub-accent text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-hub-card/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-hub-border text-gray-500'
                  }`}>
                    {tab.phase}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Disclaimer */}
          <div className="bg-hub-card/30 border border-hub-border/40 rounded-xl p-3 text-[11px] text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-400 block mb-1">تنبيه خوارزمي:</span>
            تم إجراء هذه المحاكاة لربط معايير منصات النشر بقنوات التسييل الحيوية. لا يتم تضمين أي ثناء أو مقدمات مجاملة في التحليلات والنتائج بناء على توجهات وكالة THE HUB الصارمة.
          </div>
        </div>

        {/* ACTIVE STAGE PANEL (Main Interactive Area) */}
        <div className="col-span-1 lg:col-span-9 bg-hub-card border border-hub-border rounded-lg p-4 lg:p-6 min-h-[500px] shadow-lg relative" id="active_tab_panel">
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-hub-accent/5 rounded-full blur-3xl pointer-events-none" />

          {/* ======================================================== */}
          {/* TAB 0: DATA ASSESSMENT (المرحلة 0) */}
          {/* ======================================================== */}
          {activeTab === 0 && (
            <div className="space-y-6" id="phase_0_view">
              <div className="flex items-center justify-between border-b border-hub-border pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">المرحلة 0 - تقييم موثوقية واكتمال البيانات</h2>
                  <p className="text-xs text-gray-400 mt-1">تحديد مدى كفاية الأرقام والمدخلات لبناء نموذج تخطيط معتمد خوارزمياً</p>
                </div>
                <span className={`px-3 py-1 text-xs font-bold border rounded-lg ${getScoreColor(report.confidenceScore)}`}>
                  دقة الثقة بالبيانات: {report.confidenceScore}%
                </span>
              </div>

              {/* Confidence analysis descriptive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-hub-bg/60 border border-hub-border rounded-xl p-5">
                  <h3 className="text-xs font-black text-hub-rose flex items-center gap-1.5 mb-3">
                    <BadgeAlert className="w-4 h-4" />
                    البيانات الناقصة (الحرجة لزيادة الدقة)
                  </h3>
                  {report.missingDataPoints && report.missingDataPoints.length > 0 ? (
                    <ul className="space-y-2 text-xs text-gray-300">
                      {report.missingDataPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 pr-2 border-r-2 border-hub-rose">
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-hub-emerald font-bold">لا يوجد بيانات ناقصة مصيرية، البيانات المدخلة كاملة للتدقيق التجاري مائة بالمائة.</span>
                  )}
                </div>

                <div className="bg-hub-bg/60 border border-hub-border rounded-xl p-5">
                  <h3 className="text-xs font-black text-hub-gold-light flex items-center gap-1.5 mb-3">
                    <HelpCircle className="w-4 h-4" />
                    الافتراضات الخوارزمية المعتمدة
                  </h3>
                  {report.assumptions && report.assumptions.length > 0 ? (
                    <ul className="space-y-2 text-xs text-gray-300">
                      {report.assumptions.map((ass, index) => (
                        <li key={index} className="flex items-start gap-2 pr-2 border-r-2 border-hub-gold">
                          <span>{ass}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">لا توجد افتراضات افتراضية، تمت الفحوصات العشوائية بالتطابق الكلي مع أرقام الحساب الحالية.</p>
                  )}
                </div>
              </div>

              {/* Strict Algorithmic Retention Rules Card */}
              <div className="p-4 bg-hub-accent/5 border border-hub-accent/20 rounded-xl mt-4">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                  <Hourglass className="w-4 h-4 text-hub-accent" />
                  محور الاحتفاظ في الفترات القصية (TikTok/Reels/Shorts)
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  تعتمد المنصة حالياً بنسبة 80% على <strong>أول 3 ثوانٍ</strong> (معدل الاحتصال) و<strong>نسبة الإكمال</strong>. النقص في إعطاء هذه الإحصاءات الرسمية يدفعنا لمحاكاة سلوك الجمهور الافتراضية للقطاع لتقريب نسبة الخطر التجاري.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: HUB SCORE (المرحلة 1) */}
          {/* ======================================================== */}
          {activeTab === 1 && (
            <div className="space-y-6" id="phase_1_view">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hub-border pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">المرحلة 1 - THE HUB SCORE COLD AUDIT</h2>
                  <p className="text-xs text-gray-400 mt-1">مؤشر كفوء يحلل حساب العميل من 10 محاور خوارزمية وتجارية متداخلة</p>
                </div>
                {/* Visual scorecard total indicator */}
                <span className={`self-start sm:self-auto px-4 py-1.5 text-sm font-black border rounded-lg ${getScoreColor(report.hubScore)}`}>
                  الدرجة الإجمالية كلياً: {report.hubScore} / 100
                </span>
              </div>

              {/* HISTORICAL INTERACTIVE TREND CHART */}
              <div className="bg-[#0D1117] border border-hub-border rounded-lg p-4 shadow-inner no-print" id="historical-trend-chart-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-hub-accent" />
                    <h3 className="text-xs font-black text-white">متابعة المنحنى التاريخي والتطور الخوارزمي للأداء</h3>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {clientAudits.length > 1 
                      ? `تم العثور على ${clientAudits.length} فحوصات تاريخية للعميل` 
                      : 'منحنى تتبعي افتراضي لتقدير نمو العلامة'}
                  </span>
                </div>

                <div className="h-48 w-full mt-2" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#58A6FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#21262D" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#8B949E" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        stroke="#8B949E" 
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickCount={5}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161B22',
                          borderColor: '#30363D',
                          borderRadius: '8px',
                          direction: 'rtl',
                          textAlign: 'right'
                        }}
                        labelStyle={{ color: '#8B949E', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#58A6FF', fontSize: '11px', padding: '2px 0' }}
                        formatter={(value: any, name: any, props: any) => {
                          return [
                            `درجة التقييم: ${value}/100`,
                            props.payload.label
                          ];
                        }}
                        labelFormatter={(label) => `الفحص: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#58A6FF" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        activeDot={{ r: 6, stroke: '#161B22', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <p className="text-[10px] text-gray-500 mt-2 text-right">
                  * يوضح المنحنى تصاعد كفاءة ودرجة العميل خوارزمياً (HUB SCORE) عبر الزمن لمتابعة معايير التطوير.
                </p>
              </div>

              {/* The 10 scorecard aspects vertical columns */}
              <div className="space-y-4">
                {report.dimensions && report.dimensions.map((dim, i) => {
                  const barPercent = `${dim.score * 10}%`;
                  // Determine score status text and color
                  let statusText = 'بحاجة لتعديل هيكلي';
                  let statusColor = 'text-hub-rose';
                  if (dim.score >= 8) {
                    statusText = 'مثالي تشغيلياً';
                    statusColor = 'text-hub-emerald';
                  } else if (dim.score >= 5) {
                    statusText = 'ضعف في الحفظ والمشاركة';
                    statusColor = 'text-hub-gold-light';
                  }
                  
                  return (
                    <div key={i} className="bg-hub-bg/45 border border-hub-border/60 rounded-xl p-4 transition-all hover:border-hub-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-500">{(i + 1).toString().padStart(2, '0')}.</span>
                          <span className="text-xs font-bold text-white">{dim.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-semibold py-0.5 px-2 rounded-md bg-black/30 ${statusColor}`}>
                            {statusText}
                          </span>
                          <span className="text-xs font-black text-gray-200">({dim.score}/10)</span>
                        </div>
                      </div>

                      {/* Custom Progress HTML5 bar */}
                      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            dim.score >= 8 ? 'bg-hub-emerald' : dim.score >= 5 ? 'bg-hub-gold-light' : 'bg-hub-rose'
                          }`}
                          style={{ width: barPercent }}
                        />
                      </div>

                      {/* Hard analysis text */}
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {dim.analysis === "لا توجد بيانات كافية للاستنتاج" ? (
                          <span className="text-hub-rose font-bold block">{dim.analysis}</span>
                        ) : (
                          dim.analysis
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CRITICAL BOTTLENECK (المرحلة 2) */}
          {/* ======================================================== */}
          {activeTab === 2 && (
            <div className="space-y-6" id="phase_2_view">
              <div className="border-b border-hub-border pb-4">
                <h2 className="text-lg font-black text-white">المرحلة 2 - جرد وتشريح الاختناقات العشر الحرجة</h2>
                <p className="text-xs text-gray-400 mt-1">ترتيب المشاكل الهيكلية للتأثير الخوارزمي والأثر المالي (من الأشد ضرراً إلى الأقل)</p>
              </div>

              <div className="space-y-4">
                {report.bottlenecks && report.bottlenecks.map((bot, index) => (
                  <div 
                    key={index} 
                    className="bg-hub-bg/50 border border-hub-border rounded-xl overflow-hidden transition-all hover:bg-hub-bg/80 hover:border-hub-accent/40"
                  >
                    {/* Collapsible item layout */}
                    <div className="p-4 flex items-start gap-3 border-b border-hub-border/50 bg-black/10">
                      <div className="flex-shrink-0 w-6 h-6 bg-hub-rose/10 border border-hub-rose/30 rounded-lg flex items-center justify-center text-xs font-black text-hub-rose font-mono">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs font-black text-white">{bot.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{bot.description}</p>
                      </div>
                    </div>

                    {/* Dissections */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Algo consequence */}
                      <div className="p-3 bg-black/20 border border-hub-border rounded-lg">
                        <span className="text-[10px] text-hub-amber font-bold flex items-center gap-1 mb-1.5 uppercase">
                          <Zap className="w-3.5 h-3.5" />
                          الأثر الخوارزمي المباشر:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{bot.algorithmicImpact}</p>
                      </div>

                      {/* Financial / sales impact */}
                      <div className="p-3 bg-black/20 border border-hub-border rounded-lg">
                        <span className="text-[10px] text-hub-rose font-bold flex items-center gap-1 mb-1.5 uppercase">
                          <Coins className="w-3.5 h-3.5" />
                          الأثر التجاري ونزيف المبيعات:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{bot.commercialImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: UNTAPPED OPPORTUNITY (المرحلة 3) */}
          {/* ======================================================== */}
          {activeTab === 3 && (
            <div className="space-y-6" id="phase_3_view">
              <div className="border-b border-hub-border pb-4">
                <h2 className="text-lg font-black text-white">المرحلة 3 - الفرص الكامنة غير المستغلة للعلامة</h2>
                <p className="text-xs text-gray-400 mt-1">تحديد المزايا الرقمية والمالية الكفيلة بحقن الوصول المجاني في خوارزمية العميل فوراً</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {report.opportunities && report.opportunities.map((opp, index) => (
                  <div key={index} className="bg-hub-bg/60 border border-hub-border rounded-xl p-5 relative overflow-hidden transition-all hover:border-hub-accent/40 flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-2 h-full bg-hub-emerald" />
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h3 className="text-xs font-black text-white flex items-center gap-1">
                          <span className="text-hub-emerald font-mono font-black">#{(index + 1)}</span>
                          {opp.title}
                        </h3>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-hub-emerald/10 text-hub-emerald font-black border border-hub-emerald/20">
                          صعوبة التنفيذ: {opp.easeOfImplementation}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mb-4 leading-relaxed pr-2">
                        <strong>المبرر الخوارزمي:</strong> {opp.rationale}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-hub-border/55 pt-3 text-[11px] pr-2">
                      <div className="flex justify-between items-center bg-black/15 p-1.5 rounded">
                        <span className="text-gray-500 font-bold">العائد الرقمي المتوقع:</span>
                        <span className="text-hub-emerald font-bold">{opp.expectedDigitalReturn}</span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-1.5 rounded">
                        <span className="text-gray-500 font-bold">العائد المالي المتوقع:</span>
                        <span className="text-hub-gold-light font-bold">{opp.expectedCommercialReturn}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: MEETING QUESTIONS (المرحلة 4) */}
          {/* ======================================================== */}
          {activeTab === 4 && (
            <div className="space-y-6" id="phase_4_view">
              <div className="border-b border-hub-border pb-4">
                <h2 className="text-lg font-black text-white">المرحلة 4 - أسئلة الضغط والانتزاع الاستراتيجي لعقود الوكالة</h2>
                <p className="text-xs text-gray-400 mt-1">اطرح هذه الأسئلة الحادة على العميل في جلسة البيع للكشف عن ميزانية التسويق والتعطيل الهيكلي وعقوده الحالية</p>
              </div>

              {/* Warning label */}
              <div className="bg-hub-rose/10 border border-hub-rose/20 p-4 rounded-xl text-xs text-hub-rose flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>نصيحة THE HUB لإغلاق الصفقات:</strong> لا تدخر أي إحراج، هذه الأسئلة مصممة لكسر ادعاءات العميل بوجود تسويق داخلي قوى لديه، وتوجيهه للاستسلام الفني لوكالتنا. انسخ السؤال مباشرة واستخدمه في اجتماع Zoom.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {report.strategicQuestions && report.strategicQuestions.map((q, index) => (
                  <div 
                    key={index} 
                    className="bg-hub-bg/60 border border-hub-border rounded-xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-hub-bg/90 hover:border-hub-accent"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-hub-accent/10 border border-hub-accent/30 rounded flex items-center justify-center text-[10px] font-mono font-bold text-hub-accent mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-xs text-gray-200 leading-relaxed">{q}</p>
                    </div>

                    <button
                      onClick={() => copyQuestionToClipboard(q, index)}
                      className="flex-shrink-0 p-2 bg-hub-card border border-hub-border rounded-lg text-gray-400 hover:text-white hover:border-hub-accent transition-all cursor-pointer"
                      title="نسخ السؤال للحافظة"
                    >
                      {copiedQuestionIndex === index ? (
                        <Check className="w-4 h-4 text-hub-emerald animate-scale" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: QUICK WINS (المرحلة 5) */}
          {/* ======================================================== */}
          {activeTab === 5 && (
            <div className="space-y-6" id="phase_5_view">
              <div className="border-b border-hub-border pb-4">
                <h2 className="text-lg font-black text-white">المرحلة 5 - Quick Wins لـ 30 يوماً القادمة</h2>
                <p className="text-xs text-gray-400 mt-1">إجراءات تشغيلية عديمة أو رخيصة التكلفة لامتصاص نزيف الوصول السريع</p>
              </div>

              <div className="space-y-4">
                {report.quickWins && report.quickWins.map((qw, index) => (
                  <div key={index} className="bg-hub-bg/50 border border-hub-border rounded-xl p-5 hover:border-hub-accent transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 border-b border-hub-border/55 pb-2.5">
                      <h3 className="text-xs font-black text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-hub-gold-light" />
                        {qw.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-hub-bg text-hub-gold-light border border-hub-gold/20">
                          التكلفة: {qw.implementationCost}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-hub-bg text-hub-emerald border border-hub-emerald/20">
                          مستوى الأثر: {qw.impactLevel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-hub-bg text-hub-accent border border-hub-accent/25 font-mono">
                          المدة: {qw.timeframeDays} يوم
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed pr-6">
                      {qw.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: 90 DAYS BLUEPRINT (المرحلة 6) */}
          {/* ======================================================== */}
          {activeTab === 6 && (
            <div className="space-y-6" id="phase_6_view">
              <div className="border-b border-hub-border pb-4">
                <h2 className="text-lg font-black text-white">المرحلة 6 - خطة الـ 90 يوماً الاستراتيجية للنمو</h2>
                <p className="text-xs text-gray-400 mt-1">تفريغ الأهداف والإجراءات ومؤشرات القياس موزعة على 3 أشهر حاسمة</p>
              </div>

              <div className="space-y-6">
                {report.plan90Days && report.plan90Days.map((m, index) => (
                  <div key={index} className="bg-hub-bg/60 border border-hub-border rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-hub-accent/5 rounded-full blur-xl pointer-events-none" />
                    
                    <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-hub-border pb-3 mb-4">
                      <span className="px-2.5 py-1 text-xs bg-hub-accent rounded-lg text-white font-mono font-bold">الشهر {m.month}</span>
                      بناء الهيكل الرقمي وإعادة التكوين والوصول
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Objectives list */}
                      <div className="bg-black/10 border border-hub-border rounded-lg p-3.5">
                        <h4 className="text-[11px] font-black text-hub-gold-light mb-2.5 flex items-center gap-1">
                          الأهداف التشغيلية:
                        </h4>
                        <ul className="space-y-1.5 text-xs text-gray-300">
                          {m.objectives && m.objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-hub-gold select-none">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Technical action steps */}
                      <div className="bg-black/10 border border-hub-border rounded-lg p-3.5">
                        <h4 className="text-[11px] font-black text-hub-accent mb-2.5 flex items-center gap-1">
                          الخطوات والإجراءات الفنية:
                        </h4>
                        <ul className="space-y-1.5 text-xs text-gray-300">
                          {m.actions && m.actions.map((act, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-hub-accent select-none">•</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* KPI indicators */}
                      <div className="bg-black/10 border border-hub-border rounded-lg p-3.5">
                        <h4 className="text-[11px] font-black text-hub-emerald mb-2.5 flex items-center gap-1">
                          طرق القياس ومؤشرات الأداء (KPIs):
                        </h4>
                        <ul className="space-y-1.5 text-xs text-gray-300">
                          {m.kpis && m.kpis.map((kpi, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-hub-emerald select-none">•</span>
                              <span>{kpi}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: THE HUB OPPORTUNITY (المرحلة 7) */}
          {/* ======================================================== */}
          {activeTab === 7 && (
            <div className="space-y-6" id="phase_7_view">
              <div className="border-b border-hub-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">المرحلة 7 - THE HUB OPPORTUNITY (العروض والحيازات)</h2>
                  <p className="text-xs text-gray-400 mt-1">تحديد خدمات الوكالة الست وحجز العرض البيعي الأنسب مبرراً بالعجز الخوارزمي المكتشف</p>
                </div>
                <span className="text-[10px] px-3 py-1 font-bold bg-hub-gold/10 text-hub-gold-light border border-hub-gold/30 rounded-lg">
                  مستند جاهز للمبيعات (Sales Pitch Ready)
                </span>
              </div>

              {/* Descriptive Mapping layout of services */}
              <div className="space-y-4">
                {report.recommendedServices && report.recommendedServices.map((service, index) => (
                  <div 
                    key={index} 
                    className="bg-gradient-to-r from-hub-card to-hub-bg border border-hub-border rounded-xl p-5 hover:border-hub-accent/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-hub-border/55">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-hub-accent/10 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-hub-accent" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-white">{service.name}</h3>
                          <span className="text-[9px] text-gray-500 font-mono">محل الخدمة: {service.serviceId}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-hub-emerald/10 text-hub-emerald border border-hub-emerald/20 font-black">
                        ترشيح حرج وموصى به
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-black/15 p-3 rounded-lg border border-hub-border/50">
                        <strong className="text-hub-amber text-[10px] block mb-1 uppercase">مبرر توجيه الخدمة وحل العجز المباشر:</strong>
                        <p className="text-gray-300 leading-relaxed pr-1">{service.whyApplied}</p>
                      </div>

                      <div className="bg-black/15 p-3 rounded-lg border border-hub-border/50">
                        <strong className="text-hub-emerald text-[10px] block mb-1 uppercase font-black">العوائد الملموسة والقيمة المضافة:</strong>
                        <p className="text-gray-300 leading-relaxed pr-1">{service.expectedValue}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pitch closer banner */}
              <div className="bg-gradient-to-l from-hub-accent/10 to-hub-bg border border-hub-accent/20 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-right">
                  <h4 className="text-xs font-bold text-white">جلسة إغلاق العقود وحفظ الحقوق</h4>
                  <p className="text-[10px] text-gray-400">انقل هذه البيانات مباشرة لعرض PowerPoint تقديمي، وقدمه بثقة كمخرج علمي صارم يستحيل تفاديه.</p>
                </div>
                <button 
                  onClick={copyFullReportToClipboard}
                  className="px-4 py-2 bg-hub-accent hover:bg-hub-accent-hover text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  نسخ تقرير العرض بالكامل
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRINT-ONLY COLD PARAGRAPHS AND PAGES (Strict layout formatting for prints/pdfs) */}
      <div className="hidden print:block text-slate-900 mt-12 space-y-10">
        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 0 - تقييم جودة البيانات</h2>
          <p className="text-xs mt-1">نسبة الثقة المئوية: {report.confidenceScore}%</p>
          <div className="mt-2 space-y-2 text-xs">
            <strong>البيانات الناقصة للعميل:</strong>
            <ul className="list-disc list-inside">
              {report.missingDataPoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <strong>الافتراضات المتبعة لتمرير التحليل:</strong>
            <ul className="list-disc list-inside">
              {report.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>

        <div className="page-break" />

        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 1 - تقرير HUB SCORE الشامل</h2>
          <p className="text-xs mt-1 font-bold">الدرجة الكلية: {report.hubScore}/100</p>
          <div className="mt-4 space-y-4">
            {report.dimensions.map((d, i) => (
              <div key={i} className="border-b pb-2">
                <h3 className="text-sm font-black">{d.name} ({d.score}/10)</h3>
                <p className="text-xs mt-1 text-slate-700">{d.analysis}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="page-break" />

        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 2 - الاختناقات الفنية وأثرها</h2>
          <div className="mt-4 space-y-4">
            {report.bottlenecks.map((b, i) => (
              <div key={i} className="border p-3 rounded my-2">
                <h3 className="text-sm font-bold">{b.rank}. {b.title}</h3>
                <p className="text-xs text-slate-700 mt-1">{b.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                  <span><strong>الأثر الخوارزمي:</strong> {b.algorithmicImpact}</span>
                  <span><strong>الأثر التجاري والمالي:</strong> {b.commercialImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="page-break" />

        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 3 - الفرص الاستراتيجية غير المكتشفة</h2>
          <div className="mt-4 space-y-4">
            {report.opportunities.map((o, i) => (
              <div key={i} className="border p-3 rounded">
                <h3 className="text-sm font-bold">{o.title}</h3>
                <p className="text-xs text-slate-700 mt-1"><strong>السبب والمعايير كلياً:</strong> {o.rationale}</p>
                <p className="text-xs text-slate-700"><strong>العائد الرقمي:</strong> {o.expectedDigitalReturn} | <strong>العائد المالي:</strong> {o.expectedCommercialReturn}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="page-break" />

        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 4 - أسئلة تكسير الثقة في الاجتماع</h2>
          <ol className="list-decimal list-inside text-xs mt-3 space-y-2">
            {report.strategicQuestions.map((q, i) => <li key={i} className="p-1">{q}</li>)}
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold border-b pb-2 mt-6">المرحلة 5 - Quick Wins لـ 30 يوماً القادمة</h2>
          <div className="mt-4 space-y-4">
            {report.quickWins.map((qw, i) => (
              <div key={i} className="border p-3 rounded">
                <h3 className="text-sm font-bold">{qw.title}</h3>
                <p className="text-xs text-slate-700 mt-1">{qw.description}</p>
                <p className="text-xs mt-1 text-slate-600"><strong>التكلفة:</strong> {qw.implementationCost} | <strong>الأثر:</strong> {qw.impactLevel} | <strong>الزمن:</strong> {qw.timeframeDays} يوم</p>
              </div>
            ))}
          </div>
        </div>

        <div className="page-break" />

        <div>
          <h2 className="text-xl font-bold border-b pb-2">المرحلة 6 - خطة الـ 90 يوماً للإنقاذ والنمو</h2>
          <div className="mt-4 space-y-4">
            {report.plan90Days.map((m, i) => (
              <div key={i} className="border p-3 rounded my-2">
                <h3 className="text-sm font-bold">الشهر {m.month}</h3>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <strong>الأهداف:</strong>
                    <ul className="list-disc list-inside">{m.objectives.map((o, idx) => <li key={idx}>{o}</li>)}</ul>
                  </div>
                  <div>
                    <strong>الخطوات:</strong>
                    <ul className="list-disc list-inside">{m.actions.map((a, idx) => <li key={idx}>{a}</li>)}</ul>
                  </div>
                  <div>
                    <strong>طرق القياس:</strong>
                    <ul className="list-disc list-inside">{m.kpis.map((k, idx) => <li key={idx}>{k}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold border-b pb-2 mt-6">المرحلة 7 - THE HUB OPPORTUNITY (تقديم خدمات الوكالة)</h2>
          <div className="mt-4 space-y-4">
            {report.recommendedServices.map((s, i) => (
              <div key={i} className="border p-3 rounded">
                <h3 className="text-sm font-bold">{s.name} ({s.serviceId})</h3>
                <p className="text-xs text-slate-700 mt-1"><strong>لماذا تم الترشيح:</strong> {s.whyApplied}</p>
                <p className="text-xs text-slate-700"><strong>القيمة للعميل:</strong> {s.expectedValue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Toast Notification */}
      {pdfToast && (
        <div style={{ direction: 'rtl' }} className="fixed bottom-6 right-6 z-50 bg-[#161B22] border border-hub-border px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs text-white max-w-sm animate-fade-in">
          <div className={`w-2 h-2 rounded-full ${
            pdfToast.type === 'success' ? 'bg-hub-emerald animate-pulse' : pdfToast.type === 'error' ? 'bg-hub-rose animate-pulse' : 'bg-hub-accent animate-pulse'
          }`} />
          <p className="font-bold leading-relaxed">{pdfToast.message}</p>
        </div>
      )}

      {/* PERFECT A4 PREMIUM PDF EXPORT SECTIONS */}
      {/* Positioned inside viewport bounds but hidden visually so PDF and Canvas captures are highly reliable in modern iframes */}
      <div 
        id="export-pdf-wrapper" 
        className="fixed top-0 left-0 pointer-events-none select-none text-white bg-[#0A0B0E]"
        style={{ width: '794px', zIndex: -2000, opacity: 0 }}
      >
        {/* Page 1: Cover & Assessment */}
        <div className="pdf-page w-[794px] h-[1122px] p-12 bg-[#0A0B0E] border border-hub-border flex flex-col justify-between relative overflow-hidden" dir="rtl">
          {/* Decorative background grids */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#58A6FF]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C69B3B]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-center border-b border-hub-border pb-6">
            <div className="text-right">
              <span className="text-[10px] text-hub-gold font-bold tracking-widest block uppercase font-mono">THE HUB V1 ALGORITHMIC ENGINE</span>
              <h2 className="text-xl font-black text-white mt-1">THE HUB</h2>
            </div>
            <div className="text-left text-[9px] text-gray-500 font-mono">
              CONFIDENTIAL REPORT // NOT FOR PUBLIC DISTRIBUTION
            </div>
          </div>

          <div className="my-auto space-y-8 text-right">
            <span className="text-xs bg-hub-accent/10 border border-hub-accent/30 text-hub-accent font-black py-1 px-3 rounded-md">التدقيق الفني الرقمي والتجاري</span>
            <h1 className="text-3xl font-black text-white leading-tight tracking-tight mt-3">
              تقرير الفحص الخوارزمي المتقدم والتشخيص الرقمي للعلامة
            </h1>
            <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
              تم إعداد هذا الفحص الفني الجاف لربط كفاءة انتشار المحتوى وتحركات الخوارزميات بقنوات التسييل وتحقيق عوائد المبيعات المباشرة.
            </p>

            <div className="bg-[#0D1117] border border-hub-border rounded-lg p-5 grid grid-cols-2 gap-4 mt-6">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">العميل المستهدف:</span>
                <span className="text-sm font-black text-white">{report.inputData.clientName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">القطاع / المجال الرقمي:</span>
                <span className="text-sm font-black text-hub-gold-light">{report.inputData.niche || 'غير محدد'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">المنصة المفحوصة:</span>
                <span className="text-sm font-bold text-white">{formatPlatform(report.inputData.platform)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block">تاريخ إصدار التدقيق:</span>
                <span className="text-sm font-bold text-gray-300">{new Date(report.timestamp).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>

            {/* Middle Main Scores Row */}
            <div className="grid grid-cols-2 gap-5 pt-4">
              <div className="bg-[#161B22]/60 border border-hub-border rounded-lg p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block">إجمالي كفاءة الحساب</span>
                  <span className="text-2xl font-black text-[#58A6FF] block mt-1">{report.hubScore} <span className="text-xs text-gray-500">/ 100</span></span>
                  <span className={`text-[10px] font-bold inline-block mt-1 ${
                    report.hubScore >= 70 ? 'text-hub-emerald' : report.hubScore >= 45 ? 'text-hub-gold' : 'text-hub-rose'
                  }`}>
                    {report.hubScore >= 70 ? '● كفاءة تشغيلية كاملة' : report.hubScore >= 45 ? '● تراجع خوارزمي ملموس' : '● نزيف مالي مستمر'}
                  </span>
                </div>
                <div className="w-14 h-14 bg-[#58A6FF]/10 rounded-full border border-[#58A6FF]/30 flex items-center justify-center font-black text-[#58A6FF] text-lg">
                  HVS
                </div>
              </div>

              <div className="bg-[#161B22]/60 border border-hub-border rounded-lg p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold block">معدل موثوقية البيانات</span>
                  <span className="text-2xl font-black text-hub-gold block mt-1">{report.confidenceScore}%</span>
                  <span className="text-[10px] text-gray-500 block mt-1">بناء على اكتمال المدخلات</span>
                </div>
                <div className="w-14 h-14 bg-hub-gold/10 rounded-full border border-hub-gold/30 flex items-center justify-center font-black text-hub-gold text-lg">
                  {report.confidenceScore}%
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-hub-border/50 pt-4 flex justify-between items-center text-[9px] text-gray-500 font-mono">
            <span>THE HUB BRAND ACCELERATION SYSTEM © 2026</span>
            <span>PAGE 01 / 04</span>
          </div>
        </div>

        {/* Page 2: 10 Dimensions */}
        <div className="pdf-page w-[794px] h-[1122px] p-12 bg-[#0A0B0E] border border-hub-border flex flex-col justify-between relative overflow-hidden" dir="rtl">
          <div className="flex justify-between items-center border-b border-hub-border pb-4">
            <div className="text-right">
              <span className="text-[10px] text-hub-gold font-bold block">المرحلة 1</span>
              <h3 className="text-sm font-black text-white">تشخيص الأبعاد العشرة لكفاءة محرك النمو</h3>
            </div>
            <span className="text-[9px] px-2.5 py-1 rounded bg-[#0D1117] border border-hub-border text-gray-400 font-mono">
              HUB SCORE CARD ANALYSIS MATRIX
            </span>
          </div>

          <div className="my-auto space-y-4 text-right">
            <p className="text-[11px] text-gray-400 pr-1 leading-relaxed">
              تقييم تفصيلي دقيق لكل زاوية خوارزمية وتجارية لنمو حساب العميل وسلوكه مع الجمهور:
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {report.dimensions && report.dimensions.map((dim, i) => {
                const barWidth = `${dim.score * 10}%`;
                const isHigh = dim.score >= 8;
                const isMid = dim.score >= 5;
                const colorClass = isHigh ? 'bg-hub-emerald' : isMid ? 'bg-hub-gold-light' : 'bg-hub-rose';
                const textClass = isHigh ? 'text-hub-emerald' : isMid ? 'text-hub-gold-light' : 'text-hub-rose';
                
                return (
                  <div key={i} className="bg-[#0D1117]/80 border border-hub-border rounded-lg p-3.5 flex flex-col justify-between h-[85px]">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black text-white truncate max-w-[210px]">
                        <span className="text-[10px] text-gray-500 font-mono ml-1">{(i+1).toString().padStart(2, '0')}.</span>
                        {dim.name}
                      </span>
                      <span className={`text-[10px] font-black ${textClass}`}>
                        {dim.score}/10
                      </span>
                    </div>

                    <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden my-1.5">
                      <div className={`h-full rounded-full ${colorClass}`} style={{ width: barWidth }} />
                    </div>

                    <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">
                      {dim.analysis}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-hub-border/50 pt-4 flex justify-between items-center text-[9px] text-gray-500 font-mono">
            <span>THE HUB BRAND ACCELERATION SYSTEM © 2026</span>
            <span>PAGE 02 / 04</span>
          </div>
        </div>

        {/* Page 3: Critical Bottlenecks */}
        <div className="pdf-page w-[794px] h-[1122px] p-12 bg-[#0A0B0E] border border-hub-border flex flex-col justify-between relative overflow-hidden" dir="rtl">
          <div className="flex justify-between items-center border-b border-hub-border pb-4">
            <div className="text-right">
              <span className="text-[10px] text-hub-rose font-bold block">المرحلة 2</span>
              <h3 className="text-sm font-black text-white">جرد وتشريح الاختناقات والعيوب الرقمية والتجارية</h3>
            </div>
            <span className="text-[9px] px-2.5 py-1 rounded bg-[#0D1117] border border-hub-border text-hub-rose/80 font-mono">
              SYSTEM CRITICAL ERROR LOG
            </span>
          </div>

          <div className="my-auto space-y-4 text-right">
            <p className="text-[11px] text-gray-400 pr-1 leading-relaxed">
              المشاكل الهيكلية المكتشفة التي تسبب انقطاع الوصول الخوارزمي ونزيف فرص المبيعات، مرتبة تنازلياً حسب الأثر السلبي:
            </p>

            <div className="space-y-3.5">
              {report.bottlenecks && report.bottlenecks.slice(0, 5).map((bot, idx) => (
                <div key={idx} className="bg-[#0D1117]/60 border border-hub-border rounded-lg p-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-hub-rose" />
                  <div className="flex items-center gap-2 mb-1.5 pr-2">
                    <span className="text-xs font-mono font-black text-hub-rose">#{idx+1}</span>
                    <h4 className="text-xs font-bold text-white">{bot.title}</h4>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 leading-relaxed mb-2.5 pr-2">
                    {bot.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-[10px] pr-2">
                    <div className="p-2 bg-black/30 border border-hub-border/50 rounded">
                      <span className="text-[9px] text-[#58A6FF] font-black block mb-1">الأثر الخوارزمي المباشر:</span>
                      <p className="text-gray-300 leading-tight">{bot.algorithmicImpact}</p>
                    </div>
                    <div className="p-2 bg-black/30 border border-hub-border/50 rounded">
                      <span className="text-[9px] text-hub-gold font-black block mb-1">الأثر التجاري ونقص الإيراد:</span>
                      <p className="text-gray-300 leading-tight">{bot.commercialImpact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-hub-border/50 pt-4 flex justify-between items-center text-[9px] text-gray-500 font-mono">
            <span>THE HUB BRAND ACCELERATION SYSTEM © 2026</span>
            <span>PAGE 03 / 04</span>
          </div>
        </div>

        {/* Page 4: Blueprint & Services */}
        <div className="pdf-page w-[794px] h-[1122px] p-12 bg-[#0A0B0E] border border-hub-border flex flex-col justify-between relative overflow-hidden" dir="rtl">
          <div className="flex justify-between items-center border-b border-hub-border pb-4">
            <div className="text-right">
              <span className="text-[10px] text-hub-emerald font-bold block">المراحل 3، 6 و 7</span>
              <h3 className="text-sm font-black text-white">خطة الـ 90 يوماً الاستراتيجية وعروض معالجة العجز</h3>
            </div>
            <span className="text-[9px] px-2.5 py-1 rounded bg-[#0D1117] border border-hub-border text-hub-emerald/80 font-mono">
              BRAND EXECUTION BLUEPRINT V1
            </span>
          </div>

          <div className="my-auto space-y-4 text-right">
            {/* 90 Days roadmap */}
            <div>
              <h4 className="text-xs font-black text-white mb-2 pb-1 border-b border-hub-border/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hub-accent rounded-full" />
                خطة الـ 90 يوماً للإنقاذ وإعادة هيكلة الحساب:
              </h4>

              <div className="grid grid-cols-3 gap-3">
                {report.plan90Days && report.plan90Days.map((m, idx) => (
                  <div key={idx} className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                    <span className="text-[10px] font-black text-hub-accent font-mono block mb-1">الشهر {m.month}</span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-[8px] text-gray-500 font-black block">الأهداف:</span>
                        <p className="text-[9px] text-gray-300 leading-tight">{m.objectives.join(' - ')}</p>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 font-black block">المحور الفني المباشر:</span>
                        <p className="text-[9px] text-gray-300 leading-tight">{m.actions.join(' - ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities (top 2) */}
            <div>
              <h4 className="text-xs font-black text-white mb-2 pb-1 border-b border-hub-border/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hub-emerald rounded-full" />
                الفرص الاستراتيجية الكامنة غير المستغلة:
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {report.opportunities && report.opportunities.slice(0, 2).map((opp, idx) => (
                  <div key={idx} className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                    <h5 className="text-[10px] font-bold text-white mb-1">#{idx+1} {opp.title}</h5>
                    <p className="text-[9px] text-gray-400 mb-2 leading-snug">{opp.rationale}</p>
                    <div className="grid grid-cols-2 gap-2 text-[8px] border-t border-hub-border/50 pt-2 text-[#58A6FF]">
                      <span><strong>العائد الرقمي:</strong> {opp.expectedDigitalReturn}</span>
                      <span className="text-hub-gold"><strong>العائد المالي:</strong> {opp.expectedCommercialReturn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended services */}
            <div>
              <h4 className="text-xs font-black text-white mb-2 pb-1 border-b border-hub-border/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hub-gold rounded-full" />
                عروض وكالة THE HUB لمعالجة العجز الخوارزمي:
              </h4>
              <div className="space-y-2">
                {report.recommendedServices && report.recommendedServices.slice(0, 2).map((srv, idx) => (
                  <div key={idx} className="bg-[#161B22]/70 border border-hub-border rounded-lg p-3 grid grid-cols-3 gap-3">
                    <div className="col-span-1 border-l border-hub-border/60 pl-2">
                      <span className="text-[9px] text-hub-gold block uppercase font-mono">{srv.serviceId}</span>
                      <span className="text-[10px] font-black text-white mt-0.5 block">{srv.name}</span>
                    </div>
                    <div className="col-span-2 text-[9px] leading-relaxed">
                      <span className="text-[8px] text-gray-500 font-bold block">القيمة المحققة ومعالجة الخطر:</span>
                      <p className="text-gray-300">{srv.whyApplied}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-hub-border/50 pt-4 flex justify-between items-center text-[9px] text-gray-500 font-mono">
            <span>THE HUB BRAND ACCELERATION SYSTEM © 2026</span>
            <span>PAGE 04 / 04</span>
          </div>
        </div>
      </div>

      {/* STUNNING INTERACTIVE SHARE MODAL DIALOG */}
      {showShareModal && (
        <div 
          style={{ direction: 'rtl' }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-[#0D1117] border border-hub-border max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden relative flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card Header area */}
            <div className="p-5 border-b border-hub-border bg-[#161B22] flex items-center justify-between">
              <div className="text-right">
                <span className="text-[10px] text-hub-gold font-bold block uppercase tracking-wider leading-none">مشاركة التقرير الخوارزمي</span>
                <h3 className="text-sm font-black text-white mt-1.5">أدوات إبهار ومتابعة العميل التفاعلية</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 bg-black/30 border border-hub-border hover:bg-hub-rose/10 hover:text-hub-rose rounded-lg flex items-center justify-center text-xs text-gray-400 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body scrollable area */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              
              {/* Option 1: Unique Shareable Web URL Link */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-hub-gold rounded-full" />
                  الرابط الرقمي الفريد للعميل (جاهز للتصفح والاطلاع):
                </h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  قم بنسخ هذا الرابط ومشاركته فوراً مع العميل ليدرس الفحص المفصل وتوصيات وكالة <strong>THE HUB</strong> عبر متصفحه من أي جهاز في العالم.
                </p>

                <div className="flex items-center gap-2 bg-black/30 border border-hub-border rounded-lg p-2 font-mono text-[11px] text-gray-300 relative truncate">
                  <span className="flex-1 truncate text-left pr-2">
                    {reportShareUrl ? reportShareUrl : 'جاري توليد الرابط الفريد...'}
                  </span>
                  <button
                    type="button"
                    onClick={copyShareLink}
                    disabled={!reportShareUrl}
                    className="bg-hub-accent/15 hover:bg-hub-accent/30 text-white font-sans text-[10px] font-bold px-3 py-1.5 rounded border border-hub-accent/35 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3 h-3 text-hub-emerald" />
                        تم النسخ!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        نسخ الرابط
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Beautiful Simplified Image share */}
              <div className="space-y-2.5 border-t border-hub-border/50 pt-5">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-hub-emerald rounded-full" />
                  مشاركة ملخص الفحص كصورة مبسطة (مناسبة للواتساب وجذب الانتباه):
                </h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  احصل على كارت صورة ذو أبعاد مثالية للواتساب يعرض فقط كفاءة الحساب ونقاط التقييم (Score) مع العقدة الأساسية وأهم توصية.
                </p>

                {generatingSimpleCard ? (
                  <div className="h-44 bg-black/20 border border-hub-border rounded-xl flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-hub-emerald border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-gray-400">جاري بناء وتصوير كارت العميل...</span>
                  </div>
                ) : simpleCardImg ? (
                  <div className="space-y-3">
                    {/* Visual image preview */}
                    <div className="relative border border-hub-border rounded-xl overflow-hidden bg-black/40 flex items-center justify-center p-2 group max-h-48 overflow-y-auto">
                      <img 
                        src={simpleCardImg} 
                        alt="THE HUB Simplified Summary Card" 
                        className="max-w-full rounded-lg h-auto max-h-40 object-contain shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[10px] text-gray-300 font-bold">
                        معاينة الصورة المصغرة المجهّزة
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={downloadSimpleImage}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-hub-emerald to-hub-emerald-light text-black hover:brightness-110 font-black py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      تنزيل ملخص الصورة للواتساب وجذب العميل
                    </button>
                  </div>
                ) : (
                  <div className="h-44 bg-black/20 border border-hub-border rounded-xl flex flex-col items-center justify-center gap-2">
                    <button 
                      type="button"
                      onClick={generateSimplifiedImage}
                      className="bg-[#5EC2FF]/10 text-[#5EC2FF] border border-[#5EC2FF]/30 hover:bg-[#5EC2FF]/20 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      إعادة تصوير الكارت فوراً
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-hub-border/60 bg-[#161B22]/80 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="bg-hub-bg border border-hub-border hover:bg-white/5 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs transition-all font-bold cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARING AND SIMPLIFIED CARD TEMPLATE */}
      {/* Hidden using fixed positive coordinates and opacity 0 so html2canvas renders it with precise element widths and font weights */}
      <div 
        id="export-simple-card-wrapper"
        className="fixed top-0 left-0 pointer-events-none select-none text-white bg-[#0A0B0E] border border-hub-border p-8 rounded-2xl flex flex-col justify-between"
        style={{ width: '600px', height: '780px', zIndex: -3000, opacity: 0 }}
        dir="rtl"
      >
        <div>
          {/* Logo Brand Header */}
          <div className="flex justify-between items-center border-b border-hub-border/50 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-hub-accent rounded-lg flex items-center justify-center font-black text-white text-md tracking-wider">
                H
              </div>
              <div className="text-right">
                <span className="text-[10px] text-hub-gold font-bold block leading-none">THE HUB V1</span>
                <span className="text-xs font-black text-white block">مجموعة تسريع النمو الخوارزمي</span>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[9px] text-[#5EC2FF] px-2 py-0.5 rounded border border-[#5EC2FF]/20 bg-[#5EC2FF]/5 font-mono uppercase">
                Algorithmic Overview
              </span>
            </div>
          </div>

          {/* Client Meta block */}
          <div className="bg-[#161B22]/60 border border-hub-border/40 rounded-xl p-4 mt-6 grid grid-cols-2 gap-4 text-right">
            <div>
              <span className="text-[10px] text-gray-500 font-bold block leading-none">العميل المستهدف:</span>
              <span className="text-xs font-black text-white mt-1.5 block">{report.inputData.clientName}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block leading-none">المنصة والعمق الخوارزمي:</span>
              <span className="text-xs font-black text-hub-gold-light mt-1.5 block">{formatPlatform(report.inputData.platform)}</span>
            </div>
          </div>

          {/* Scores block */}
          <div className="grid grid-cols-12 gap-4 items-center mt-6">
            {/* Circular score display */}
            <div className="col-span-4 bg-[#161B22]/40 border border-hub-border/40 rounded-xl p-4 flex flex-col items-center justify-center h-28">
              <div className="text-3xl font-black text-white leading-none">{report.hubScore}</div>
              <div className="text-[9px] text-gray-400 font-bold mt-1 text-center">THE HUB SCORE</div>
              <span className={`text-[8px] font-black mt-2 px-1.5 py-0.5 rounded ${
                report.hubScore >= 70 ? 'bg-hub-emerald/10 text-hub-emerald animate-pulse' : report.hubScore >= 45 ? 'bg-hub-gold/10 text-hub-gold-light' : 'bg-hub-rose/10 text-hub-rose'
              }`}>
                {report.hubScore >= 70 ? 'صحيح تشغيلياً' : report.hubScore >= 45 ? 'تراجع خوارزمي' : 'نزيف قنوات حاد'}
              </span>
            </div>

            {/* Metrics descriptors */}
            <div className="col-span-8 bg-[#161B22]/40 border border-hub-border/40 rounded-xl p-4 h-28 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">درجة موثوقية التقييم:</span>
                <span className="font-bold text-white">{report.confidenceScore}%</span>
              </div>
              <div className="w-full bg-[#0D1117] h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-hub-gold h-full rounded-full" style={{ width: `${report.confidenceScore}%` }} />
              </div>
              <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">
                يعبّر هذا الفحص الفوري عن مدى قابلية الحساب للتوافق التام مع خوارزمية النشر العضوي وتسييل معدلات الوصول الحقيقية.
              </p>
            </div>
          </div>

          {/* Key Bottleneck */}
          {report.bottlenecks && report.bottlenecks.length > 0 && (
            <div className="mt-6 space-y-2 text-right">
              <span className="text-[10px] text-hub-rose font-black uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hub-rose rounded-full" />
                العجز الأبرز مكتشفاً (النزيف الخوارزمي الأساسي):
              </span>
              <div className="bg-hub-rose/5 border border-hub-rose/20 rounded-xl p-4">
                <h4 className="text-xs font-black text-white leading-snug">{report.bottlenecks[0].title}</h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{report.bottlenecks[0].description}</p>
                <div className="grid grid-cols-2 gap-4 mt-2.5 pt-2 border-t border-hub-border/40 text-[9px] text-gray-450">
                  <span><strong>الأثر الخوارزمي:</strong> {report.bottlenecks[0].algorithmicImpact}</span>
                  <span><strong>أثر المبيعات:</strong> {report.bottlenecks[0].commercialImpact}</span>
                </div>
              </div>
            </div>
          )}

          {/* Key Action/Quick win */}
          {report.quickWins && report.quickWins.length > 0 && (
            <div className="mt-6 space-y-2 text-right">
              <span className="text-[10px] text-hub-emerald font-black uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-hub-emerald rounded-full" />
                التوصية السريعة الفورية للتنفيذ خلال 30 يوماً:
              </span>
              <div className="bg-hub-emerald/5 border border-hub-emerald/20 rounded-xl p-4">
                <h4 className="text-xs font-black text-white leading-snug flex items-center justify-between">
                  <span>{report.quickWins[0].title}</span>
                  <span className="text-[8px] bg-hub-emerald/20 text-hub-emerald px-1.5 py-0.5 rounded font-mono">
                    تأثير: {report.quickWins[0].impactLevel}
                  </span>
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{report.quickWins[0].description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer brand statement */}
        <div className="border-t border-hub-border/50 pt-4 flex justify-between items-center text-[9px] text-gray-500 font-mono">
          <span>THE HUB PLATFORM SHIELD SYSTEM © 2026</span>
          <span className="text-hub-gold-light font-black tracking-widest leading-none">THE HUB DIGITAL AGENCY</span>
        </div>
      </div>
    </div>
  );
}
