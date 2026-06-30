/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClientDataInput } from '../types';
import { PRESET_CLIENTS, PresetClient } from './presets';
import { Sparkles, BarChart2, Radio, UserCheck, HelpCircle, AlertTriangle, ClipboardList, FileText, CheckCircle2, Trash2, Bot, ChevronLeft, ChevronRight, Sliders, Eye, EyeOff, Loader2 } from 'lucide-react';

function calculateLivePredictiveScore(formData: ClientDataInput) {
  let score = 50;

  // 1. Hook Retention
  if (formData.first3sRetention) {
    const val = formData.first3sRetention;
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      if (num >= 65) score += 18;
      else if (num >= 45) score += 10;
      else if (num >= 25) score += 3;
      else score -= 12;
    } else {
      const t = val.toLowerCase();
      if (t.includes('ممتاز') || t.includes('جاذب') || t.includes('قوي')) score += 12;
      if (t.includes('ضعيف') || t.includes('تسرب') || t.includes('قليل')) score -= 10;
    }
  }

  // 2. Watch Time / Completion
  if (formData.watchTimeCompletion) {
    const val = formData.watchTimeCompletion;
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      if (num >= 45) score += 18;
      else if (num >= 25) score += 10;
      else if (num >= 12) score += 3;
      else score -= 12;
    } else {
      const t = val.toLowerCase();
      if (t.includes('ممتاز') || t.includes('كامل') || t.includes('مرتفع')) score += 12;
      if (t.includes('ضعيف') || t.includes('منخفض') || t.includes('تراجع')) score -= 10;
    }
  }

  // 3. Engagement
  const l = parseInt(formData.averageLikes || '0', 10);
  const c = parseInt(formData.averageComments || '0', 10);
  const sh = parseInt(formData.averageShares || '0', 10);
  const sa = parseInt(formData.averageSaves || '0', 10);
  if (l > 0 || c > 0 || sh > 0 || sa > 0) {
    const total = l + c * 3 + sh * 5 + sa * 4;
    if (total >= 400) score += 12;
    else if (total >= 100) score += 6;
    else score -= 4;
  }

  // 4. Posting Frequency
  if (formData.postingFrequency) {
    const f = formData.postingFrequency;
    if (f.includes('يومي') || f.includes('بانتظام') || f.includes('3 مقاطع يومياً')) score += 8;
    else if (f.includes('عشوائي') || f.includes('متقطع') || f.includes('أسبوعين')) score -= 12;
  }

  // 5. Community Interaction
  if (formData.communityInteraction) {
    const comm = formData.communityInteraction;
    if (comm.includes('سريعة') || comm.includes('حيوية') || comm.includes('ردود سريعة')) score += 8;
    else if (comm.includes('إهمال') || comm.includes('تجاهل') || comm.includes('نهمل')) score -= 12;
  }

  // Bound between 12 and 94
  score = Math.max(12, Math.min(94, score));

  let status = 'منخفض حرج (نزيف)';
  let color = 'text-hub-rose border-hub-rose/30 bg-hub-rose/10';
  let desc = 'الحساب يواجه خللاً خوارزمياً يمنعه من الانتشار أو المبيعات العالية.';
  
  if (score >= 75) {
    status = 'آمن متميز (نمو واعد)';
    color = 'text-[#3FB950] border-emerald-500/30 bg-[#3FB950]/10';
    desc = 'مؤشرات قوية وجاذبة للجمهور. الحساب يحتاج فقط لهندسة تسييل أفضل.';
  } else if (score >= 45) {
    status = 'تراجع متوسط (تذبذب)';
    color = 'text-hub-gold-light border-hub-gold/30 bg-[#ff6600]/10';
    desc = 'أداء متوسط شابه تذبذب جزئي في معدل الاحتفاظ أو فواصل في النشر.';
  }

  return { score, status, color, desc };
}

interface ClientFormProps {
  onSubmit: (data: ClientDataInput) => void;
  isLoading: boolean;
}

export default function ClientForm({ onSubmit, isLoading }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientDataInput>(() => {
    return {
      clientName: localStorage.getItem('hub_clientName') || '',
      niche: localStorage.getItem('hub_niche') || '',
      platform: (localStorage.getItem('hub_platform') as ClientDataInput['platform']) || 'instagram',
      profileUrl: localStorage.getItem('hub_profileUrl') || '',
      followersCount: localStorage.getItem('hub_followersCount') || '',
      activeCommunitySize: localStorage.getItem('hub_activeCommunitySize') || '',
      first3sRetention: localStorage.getItem('hub_first3sRetention') || '',
      watchTimeCompletion: localStorage.getItem('hub_watchTimeCompletion') || '',
      averageLikes: localStorage.getItem('hub_averageLikes') || '',
      averageComments: localStorage.getItem('hub_averageComments') || '',
      averageShares: localStorage.getItem('hub_averageShares') || '',
      averageSaves: localStorage.getItem('hub_averageSaves') || '',
      contentHooksExample: localStorage.getItem('hub_contentHooksExample') || '',
      contentCaptionStyle: localStorage.getItem('hub_contentCaptionStyle') || '',
      postingFrequency: localStorage.getItem('hub_postingFrequency') || '',
      communityInteraction: localStorage.getItem('hub_communityInteraction') || '',
      customNotes: localStorage.getItem('hub_customNotes') || ''
    };
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showManualFields, setShowManualFields] = useState<boolean>(false);

  // n8n Webhook state and polling logic
  const [latestN8n, setLatestN8n] = useState<any>(null);
  const [hasNewN8n, setHasNewN8n] = useState<boolean>(false);
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapingStatus, setScrapingStatus] = useState<string>('');
  const [showScrapingNotification, setShowScrapingNotification] = useState<boolean>(false);

  const triggerN8nScraping = async () => {
    if (!formData.profileUrl) {
      alert('الرجاء إدخال رابط الحساب المستهدف أولاً.');
      return;
    }

    setIsScraping(true);
    setScrapingStatus('جاري الاتصال ببوابة n8n وتفعيل الكاشف التلقائي...');

    try {
      const res = await fetch('/api/n8n/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileUrl: formData.profileUrl,
          platform: formData.platform,
          clientName: formData.clientName,
          niche: formData.niche
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScrapingStatus(data.message || 'تم إرسال طلب الكشط بنجاح! ننتظر حالياً البيانات الحية من n8n...');
        localStorage.setItem('pending_n8n_scrape', 'true');
      } else {
        const errData = await res.json();
        alert(`فشل إطلاق n8n: ${errData.error || 'خطأ غير معروف'}`);
        setIsScraping(false);
      }
    } catch (e) {
      console.error('Failed to trigger n8n scrape:', e);
      alert('حدث خطأ أثناء الاتصال بالخادم لإطلاق n8n.');
      setIsScraping(false);
    }
  };

  useEffect(() => {
    const checkN8n = async () => {
      try {
        const res = await fetch('/api/webhook/n8n/latest');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.id) {
              setLatestN8n(data);
              const lastSeenId = localStorage.getItem('last_seen_n8n_id');
              const isPendingScrape = localStorage.getItem('pending_n8n_scrape') === 'true';

              if (lastSeenId !== data.id) {
                if (isPendingScrape) {
                  // Smart Injection (الحقن الذكي التلقائي أمام المستخدم)
                  setFormData(prev => ({
                    ...prev,
                    clientName: data.clientName || prev.clientName || '',
                    niche: data.niche || prev.niche || '',
                    platform: data.platform || prev.platform || 'instagram',
                    profileUrl: data.profileUrl || prev.profileUrl || '',
                    followersCount: data.followersCount || prev.followersCount || '',
                    activeCommunitySize: data.activeCommunitySize || prev.activeCommunitySize || '',
                    first3sRetention: data.first3sRetention || prev.first3sRetention || '',
                    watchTimeCompletion: data.watchTimeCompletion || prev.watchTimeCompletion || '',
                    averageLikes: data.averageLikes || prev.averageLikes || '',
                    averageComments: data.averageComments || prev.averageComments || '',
                    averageShares: data.averageShares || prev.averageShares || '',
                    averageSaves: data.averageSaves || prev.averageSaves || '',
                    contentHooksExample: data.contentHooksExample || prev.contentHooksExample || '',
                    contentCaptionStyle: data.contentCaptionStyle || prev.contentCaptionStyle || '',
                    postingFrequency: data.postingFrequency || prev.postingFrequency || '',
                    communityInteraction: data.communityInteraction || prev.communityInteraction || '',
                    customNotes: data.customNotes || prev.customNotes || ''
                  }));

                  localStorage.setItem('last_seen_n8n_id', data.id);
                  localStorage.removeItem('pending_n8n_scrape');
                  setIsScraping(false);
                  setScrapingStatus('');
                  setShowScrapingNotification(true);
                } else {
                  setHasNewN8n(true);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch latest n8n payload:', e);
      }
    };

    checkN8n();
    // Poll more frequently when waiting for scrape
    const intervalTime = isScraping ? 2000 : 7000;
    const interval = setInterval(checkN8n, intervalTime);
    return () => clearInterval(interval);
  }, [isScraping]);

  const livePredictive = calculateLivePredictiveScore(formData);

  // Define steps for our Interactive Wizard Bot
  const wizardSteps = [
    {
      name: 'clientName',
      title: 'اسم العميل والعلامة التجارية',
      question: 'مرحباً بك في مُعالج الفحص الرقمي لـ THE HUB. ما هو اسم العميل الخاضع للفحص؟ 🏢',
      placeholder: 'مثال: شركة إرث العقارية',
      type: 'text',
      fieldKeys: ['clientName'],
      presetChips: ['تمور المدينة الفاخرة', 'قهوة سبيشالتي هاب', 'مجوهرات الأرجوان', 'نخبة العطور العالمية', 'مجموعة لوسين العقارية']
    },
    {
      name: 'niche',
      title: 'المجال والنشاط التجاري',
      question: 'ممتاز! وما هو مجال عمل العميل بالتفصيل وطبيعة تخصصه التجاري؟ 💼',
      placeholder: 'مثال: تسويق القصور السكنية الفاخرة أو بيع العطور المباشرة',
      type: 'text',
      fieldKeys: ['niche'],
      presetChips: ['عقارات وقصور فاخرة', 'مطاعم وكافيهات مختصة', 'عطور ومستحضرات تجميل', 'عيادات طب الاسنان والتجميل', 'متاجر ملابس وأزياء', 'استشارات وحلول تدريبية']
    },
    {
      name: 'platform',
      title: 'المنصة المستهدفة بالتحليل',
      question: 'على أي منصة يتركز نشاطه الأساسي المستهدف بالتحليل خوارزمياً؟ 📱',
      type: 'select',
      options: [
        { value: 'instagram', label: 'إنستغرام ريلز (Instagram Reels)' },
        { value: 'tiktok', label: 'تيك توك (TikTok Videos)' },
        { value: 'youtube_shorts', label: 'يوتيوب شورتس (YouTube Shorts)' },
        { value: 'x', label: 'منصة إكس (X / Twitter Content)' },
        { value: 'all', label: 'كل المنصات كحزمة متكاملة (All Platforms)' }
      ],
      fieldKeys: ['platform']
    },
    {
      name: 'profileUrl',
      title: 'رابط الحساب المستهدف (URL)',
      question: 'رائع! يرجى تزويدنا برابط الحساب المستهدف بالتحليل (URL) للعلامة التجارية: 🔗',
      placeholder: 'مثال: https://instagram.com/username',
      type: 'text',
      fieldKeys: ['profileUrl'],
      presetChips: ['https://instagram.com/thehub.agency', 'https://tiktok.com/@thehub.agency']
    },
    {
      name: 'followersCount',
      title: 'عدد المتابعين الإجمالي',
      question: 'كم عدد المتابعين الحاليين على الحساب أو المنصة التي تم اختيارها؟ 📊',
      placeholder: 'مثال: 50,000',
      type: 'text',
      fieldKeys: ['followersCount'],
      presetChips: ['5,000', '15,000', '50,000', '120,000', '500,000', '1,000,000']
    },
    {
      name: 'activeCommunitySize',
      title: 'حجم ونشاط المجتمع الفعلي المتفاعل',
      question: 'رائع! وما هو حجم ونشاط المجتمع الفعلي المتفاعل بانتظام (الجمهور الحقيقي)؟ 👥',
      placeholder: 'مثال: أقل من 100 شخص بانتظام أو متفاعل ضعيف جداً',
      type: 'text',
      fieldKeys: ['activeCommunitySize'],
      presetChips: ['خامل بالكامل وشبه منعدم', 'جمهور معقول بمثابرة متوسطة', 'نشط جداً ويبحث عن تفاعل مالي', 'نخبة متفاعلة تشتري بوعي']
    },
    {
      name: 'first3sRetention',
      title: 'نسبة الاحتفاظ في أول 3 ثوانٍ (Hook %)',
      question: 'لندخل في الأرقام العميقة: كم نسبة الاحتفاظ في أول 3 ثوانٍ (Hook % - نسبة جذب الانتباه)؟ ⏳',
      placeholder: 'مثال: 25% أو ضعيفة جداً وتتسرب سريعاً',
      type: 'text',
      fieldKeys: ['first3sRetention'],
      presetChips: ['15% (ضعيف للتطلعات)', '35% (متوسط عادي)', '55% (ممتاز وجاذب)', '75% (استثنائي وقوي)']
    },
    {
      name: 'watchTimeCompletion',
      title: 'نسبة إكمال الفيديو الكلي (Watch rate)',
      question: 'وما هي نسبة إكمال الفيديو الكلي في المتوسط (Watch Time Completion) لو تتوفر؟ 🔄',
      placeholder: 'مثال: 12% أو منخفض للغاية',
      type: 'text',
      fieldKeys: ['watchTimeCompletion'],
      presetChips: ['5% (ضعيف جداً وتتسرب الفائدة)', '15% (متوسط للقطاع)', '30% (ناجح وجاذب)', '50% (نادر ومثالي)']
    },
    {
      name: 'engagement',
      title: 'متوسط الأرقام التفاعلية لبيانات الفحص',
      question: 'يرجى تزويدي ببيانات التفاعل الوسطية لكل منشور لمطابقة خوارزميات HUB SCORE: 📈',
      type: 'engagement_group',
      fieldKeys: ['averageLikes', 'averageComments', 'averageShares', 'averageSaves']
    },
    {
      name: 'contentHooksExample',
      title: 'أمثلة على الخطافات والعناوين الحالية',
      question: 'ما هي صياغة العناوين والخطافات (Hooks) المستعملة حالياً في مقاطع الفيديو الخاصة به؟ 🎤',
      placeholder: 'مثال: "شاهد الفخامة معنا" أو استعراض روتيني جداً بدون خطاف كلامي',
      type: 'textarea',
      fieldKeys: ['contentHooksExample'],
      presetChips: ['استعراض موسيقي صامت دون تفاعل كلامي', 'سؤال مستفز أو صادم بأول ثانيتين', 'الكشف عن السعر أو النتيجة فورياً', 'خطاف تقليدي باهت (هيا بنا نشاهد كذا)']
    },
    {
      name: 'contentCaptionStyle',
      title: 'أسلوب وصياغة الوصف والهاشتاغات',
      question: 'كيف تتم صياغة الوصف (Caption) أسفل الفيديوهات؟ هل نكتب تفاصيل مفرطة وسعر أم قليل تفاعل؟ 📝',
      placeholder: 'مثال: نكتب السعر مع 20 هاشتاغ مكرر أو نترك الوصف فارغاً',
      type: 'textarea',
      fieldKeys: ['contentCaptionStyle'],
      presetChips: ['وصف طويل جداً وممل مع تفاصيل وعقود', 'وصف قصير بعبارة تفاعلية بليغة وجذابة', 'فارغ من الوصف والهاشتاغات', 'حشو من الهاشتاغات المكررة والروابط']
    },
    {
      name: 'postingFrequency',
      title: 'معدل وتيرة النشر والتواجد الرقمي',
      question: 'ما هو معدل التواجد ونشر المحتوى ووتيرته المعتادة لديه؟ 🗓️',
      placeholder: 'مثال: مقطع واحد كل أسبوعين بشكل متقطع',
      type: 'text',
      fieldKeys: ['postingFrequency'],
      presetChips: ['نشر عشوائي غير منتظم', 'مقطع كل أسبوعين (متقطع)', '3 مقاطع أسبوعياً', 'مقطع واحد يومياً بانتظام', '3 مقاطع يومياً (مكثف)']
    },
    {
      name: 'communityInteraction',
      title: 'التفاعل مع التعليقات والـ DM الخاص',
      question: 'كيف يتم الرد على الكومنتات والتفاعل على الخاص؟ هل نراسلهم أم نتجاهل؟ 💬',
      placeholder: 'مثال: نكتب "تواصل معنا خاص" بدون فائدة حقيقية أو نهمل الرد تماماً',
      type: 'text',
      fieldKeys: ['communityInteraction'],
      presetChips: ['الرد بكلمة خاص أو إهمال غريب', 'توجيه آلي للخاص دون تفاعل مكمل', 'ردود سريعة ومحترمة وحيوية', 'ردود متأخرة جداً تسرب المشترين']
    },
    {
      name: 'customNotes',
      title: 'الصعوبات الترويجية والملاحظات العميقة',
      question: 'أخيراً، هل توجد أي ملاحظات إضافية، صعوبات تجارية، أو تحديات مبيعات معلنة للعميل؟ 🎯',
      placeholder: 'مثال: صرف مبالغ هائلة على الإعلانات والتصوير ولكن لا توجد عوائد ومبيعات حقيقية بالرغم من زيادة المشاهدات العشوائية...',
      type: 'textarea',
      fieldKeys: ['customNotes'],
      presetChips: ['مبالغ مالية هائلة للمونتاج والتمويل بدون عائد مبيعات', 'متابعين كثيرون ولكن لا يمكن تحويلهم لقناة البيع', 'عجز تام عن إقناع العملاء بالطلب أو الحجز', 'توقف الحساب عن النمو والانتشار مع قلة التفاعل']
    }
  ];

  // Save changes to localStorage on any state mutation
  useEffect(() => {
    localStorage.setItem('hub_clientName', formData.clientName || '');
    localStorage.setItem('hub_niche', formData.niche || '');
    localStorage.setItem('hub_platform', formData.platform || 'instagram');
    localStorage.setItem('hub_profileUrl', formData.profileUrl || '');
    localStorage.setItem('hub_followersCount', formData.followersCount || '');
    localStorage.setItem('hub_activeCommunitySize', formData.activeCommunitySize || '');
    localStorage.setItem('hub_first3sRetention', formData.first3sRetention || '');
    localStorage.setItem('hub_watchTimeCompletion', formData.watchTimeCompletion || '');
    localStorage.setItem('hub_averageLikes', formData.averageLikes || '');
    localStorage.setItem('hub_averageComments', formData.averageComments || '');
    localStorage.setItem('hub_averageShares', formData.averageShares || '');
    localStorage.setItem('hub_averageSaves', formData.averageSaves || '');
    localStorage.setItem('hub_contentHooksExample', formData.contentHooksExample || '');
    localStorage.setItem('hub_contentCaptionStyle', formData.contentCaptionStyle || '');
    localStorage.setItem('hub_postingFrequency', formData.postingFrequency || '');
    localStorage.setItem('hub_communityInteraction', formData.communityInteraction || '');
    localStorage.setItem('hub_customNotes', formData.customNotes || '');
  }, [formData]);

  const clearDraftData = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (confirm('هل أنت متأكد من تصفير الحقول الحالية وبدء فحص جديد لعميل آخر؟')) {
      const keys = [
        'hub_clientName',
        'hub_niche',
        'hub_platform',
        'hub_profileUrl',
        'hub_followersCount',
        'hub_activeCommunitySize',
        'hub_first3sRetention',
        'hub_watchTimeCompletion',
        'hub_averageLikes',
        'hub_averageComments',
        'hub_averageShares',
        'hub_averageSaves',
        'hub_contentHooksExample',
        'hub_contentCaptionStyle',
        'hub_postingFrequency',
        'hub_communityInteraction',
        'hub_customNotes'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem('hub_quick_intake_text');
      
      setFormData({
        clientName: '',
        niche: '',
        platform: 'instagram',
        profileUrl: '',
        followersCount: '',
        activeCommunitySize: '',
        first3sRetention: '',
        watchTimeCompletion: '',
        averageLikes: '',
        averageComments: '',
        averageShares: '',
        averageSaves: '',
        contentHooksExample: '',
        contentCaptionStyle: '',
        postingFrequency: '',
        communityInteraction: '',
        customNotes: ''
      });
      setSelectedPresetId('');
      setCurrentStepIndex(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = PRESET_CLIENTS.find(p => p.id === presetId);
    if (preset) {
      setFormData({ ...preset.data });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      alert('يجب إدخال اسم العميل أولاً لإطلاق الفحص.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="bg-hub-card border border-hub-border rounded-lg p-4 lg:p-6 shadow-xl relative overflow-hidden" id="client_form_container">
      {/* Subtle styling accent grids */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-hub-accent/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-hub-gold/5 rounded-full blur-2xl pointer-events-none" />

      {/* 🎉 Smart Injection Success Banner */}
      {showScrapingNotification && (
        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500 rounded-xl text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden animate-pulse">
          <div className="absolute top-0 right-0 w-1 bg-emerald-500 h-full" />
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0 animate-bounce" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                تمت المزامنة والحقن الذكي بنجاح! ⚡🤖
              </h4>
              <p className="text-gray-300 leading-relaxed">
                تم سحب أحدث بيانات الحساب من n8n وحقنها تلقائياً داخل كافة الحقول اليدوية للتطبيق.
              </p>
              <span className="text-[10px] text-gray-400 block">جميع الخانات جاهزة الآن للمراجعة والتعديل اليدوي قبل توليد التقرير.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowScrapingNotification(false)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs cursor-pointer mr-auto sm:mr-0 self-end sm:self-center transition-all"
          >
            تأكيد ومراجعة البيانات
          </button>
        </div>
      )}

      {/* 🤖 n8n webhook auto-injector alert */}
      {hasNewN8n && latestN8n && (
        <div className="mb-6 p-4 bg-hub-accent/10 border border-hub-accent rounded-xl text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden animate-pulse">
          <div className="absolute top-0 right-0 w-1 bg-hub-accent h-full" />
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-hub-gold-light mt-0.5 flex-shrink-0 animate-bounce" />
            <div className="space-y-1 text-right">
              <h4 className="font-extrabold text-hub-gold-light flex items-center gap-1.5">
                مزامنة خوارزمية: تم استقبال بيانات جديدة من n8n! 🤖
              </h4>
              <p className="text-gray-300 leading-relaxed">
                العميل: <strong className="text-white">{latestN8n.clientName || 'بدون اسم'}</strong> | 
                النشاط: <strong className="text-white">{latestN8n.niche || 'بدون تخصص'}</strong> | 
                المنصة: <strong className="text-white">{latestN8n.platform || 'instagram'}</strong>
              </p>
              <span className="text-[9px] text-gray-500 block">وصلت عبر n8n Webhook</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mr-auto sm:mr-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  clientName: latestN8n.clientName || '',
                  niche: latestN8n.niche || '',
                  platform: latestN8n.platform || 'instagram',
                  profileUrl: latestN8n.profileUrl || '',
                  followersCount: latestN8n.followersCount || '',
                  activeCommunitySize: latestN8n.activeCommunitySize || '',
                  first3sRetention: latestN8n.first3sRetention || '',
                  watchTimeCompletion: latestN8n.watchTimeCompletion || '',
                  averageLikes: latestN8n.averageLikes || '',
                  averageComments: latestN8n.averageComments || '',
                  averageShares: latestN8n.averageShares || '',
                  averageSaves: latestN8n.averageSaves || '',
                  contentHooksExample: latestN8n.contentHooksExample || '',
                  contentCaptionStyle: latestN8n.contentCaptionStyle || '',
                  postingFrequency: latestN8n.postingFrequency || '',
                  communityInteraction: latestN8n.communityInteraction || '',
                  customNotes: latestN8n.customNotes || ''
                });
                localStorage.setItem('last_seen_n8n_id', latestN8n.id);
                setHasNewN8n(false);
              }}
              className="px-3.5 py-2 bg-hub-accent hover:bg-opacity-90 text-white font-black rounded-lg transition-all text-xs cursor-pointer shadow-lg shadow-hub-accent/25"
            >
              حقن وتعبئة البيانات تلقائياً
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('last_seen_n8n_id', latestN8n.id);
                setHasNewN8n(false);
              }}
              className="px-2.5 py-2 bg-[#161B22] border border-hub-border hover:bg-black/40 text-gray-400 hover:text-white rounded-lg text-xs cursor-pointer"
            >
              تجاهل
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-hub-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2" id="form-title">
            <Radio className="w-5 h-5 text-hub-gold-light animate-pulse" />
            تغذية بيانات فحص V1
          </h2>
          <p className="text-xs text-gray-400 mt-1">أدخل بيانات ومعايير العميل أو طبق أحد النماذج الافتراضية المعدة للتدريب والوكالة</p>
        </div>

        {/* Dropdown presets selector and smart reset buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">نماذج جاهزة:</label>
            <select
              value={selectedPresetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="bg-hub-bg border border-hub-border text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-hub-gold transition-all cursor-pointer"
              id="preset_selector"
            >
              <option value="">-- اختر نموذج جاهز للتعبئة الأوتوماتيكية --</option>
              {PRESET_CLIENTS.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.niche})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={clearDraftData}
            className="px-3 py-2 rounded-lg text-xs font-bold transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            id="clear-form-draft-btn"
            title="إنشاء فحص جديد (تصفير الحقول)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>إنشاء فحص جديد (تصفير الحقول)</span>
          </button>
        </div>
      </div>

      {/* 🚀 INTERACTIVE WIZARD BOT (GLASSMORPHISM STYLE) */}
      <div 
        className="transition-all duration-300 rounded-2xl p-5 mb-6 text-right border relative overflow-hidden shadow-[0_8px_32px_rgba(255,102,0,0.06)] bg-black/60 backdrop-blur-md"
        style={{ 
          borderColor: 'rgba(255, 102, 0, 0.25)'
        }}
        id="interactive-wizard-bot-section"
      >
        {/* Neon decorative background glow */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-[#ff6600]/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Bot Chat Header */}
        <div className="flex items-center justify-between gap-3 border-b border-hub-border pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
              <Bot className="w-6 h-6 text-[#ff6600] animate-bounce" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                مُساعد الفحص الذكي: THE HUB BOT
                <span className="text-[9px] font-bold bg-[#ff6600]/10 text-[#ff6600] border border-[#ff6600]/30 px-1.5 py-0.5 rounded-full">نشط</span>
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">دردشة تفاعلية لجمع وتحليل مؤشرات ومعايير العميل خطوة بخطوة</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 bg-[#161B22] border border-hub-border px-2.5 py-1 rounded-lg">
            <span>خطوة {currentStepIndex + 1} من {wizardSteps.length}</span>
          </div>
        </div>

        {/* Progress Bar & Live Score Health Predictor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 border-b border-hub-border/30 pb-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5">
              <span>اكتمال حقول المعالج الذكي</span>
              <span className="text-[#ff6600] font-black">{Math.round(((currentStepIndex + 1) / wizardSteps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-hub-bg h-1.5 rounded-full overflow-hidden border border-hub-border/50">
              <div 
                className="bg-gradient-to-l from-[#ff6600] to-amber-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(255,102,0,0.5)]"
                style={{ width: `${((currentStepIndex + 1) / wizardSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Live Score Predictor (orange-glass design) */}
          <div className="bg-gradient-to-r from-slate-900/80 to-black/40 border border-[#ff6600]/20 rounded-xl p-2.5 flex items-center gap-3 shadow-inner">
            <div className="relative flex items-center justify-center w-11 h-11 bg-black/50 border border-hub-border rounded-full flex-shrink-0">
              <div className="absolute inset-0 bg-[#ff6600]/5 blur-sm rounded-full" />
              <span className="text-xs font-black text-white z-10">{livePredictive.score}</span>
              <span className="text-[7px] text-gray-400 absolute bottom-1 font-mono">HUB SCORE</span>
            </div>
            <div className="flex-1 text-right min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] text-gray-400">التنبؤ المباشر بصحة الحساب:</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${livePredictive.color}`}>
                  {livePredictive.status}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 leading-snug truncate">
                {livePredictive.desc}
              </p>
            </div>
          </div>
        </div>

        {/* Bot Question Chat Bubble styled */}
        <div className="space-y-4">
          <div className="flex gap-3 items-start text-right">
            <div className="w-8 h-8 rounded-full bg-[#ff6600]/10 border border-[#ff6600]/30 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Bot className="w-4 h-4 text-[#ff6600]" />
            </div>
            <div className="flex-1 bg-black/40 border border-hub-border/50 rounded-2xl p-4 text-xs md:text-sm text-gray-100 leading-relaxed shadow-lg relative">
              <span className="text-[10px] text-[#ff6600] block mb-1 font-mono tracking-wider">مُعالج THE HUB V1 🤖</span>
              <p className="font-bold text-gray-100">{wizardSteps[currentStepIndex].question}</p>
              
              {/* Dynamic Answer Fields */}
              <div className="mt-4">
                {wizardSteps[currentStepIndex].type === 'text' && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      name={wizardSteps[currentStepIndex].name}
                      placeholder={wizardSteps[currentStepIndex].placeholder}
                      value={formData[wizardSteps[currentStepIndex].name as keyof ClientDataInput] || ''}
                      onChange={handleInputChange}
                      className="w-full bg-[#161B22] border border-hub-border text-white text-xs md:text-sm rounded-lg p-2.5 focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600] focus:outline-none transition-all placeholder:text-gray-600"
                      id={`wizard_input_${wizardSteps[currentStepIndex].name}`}
                      autoFocus
                    />
                    
                    {/* Special n8n Scrape Trigger inside the Wizard URL step */}
                    {wizardSteps[currentStepIndex].name === 'profileUrl' && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={isScraping || !formData.profileUrl}
                          onClick={triggerN8nScraping}
                          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            isScraping
                              ? 'bg-hub-border text-gray-500 cursor-not-allowed'
                              : !formData.profileUrl
                              ? 'bg-slate-800/40 text-gray-500 border border-hub-border/40 cursor-not-allowed'
                              : 'bg-[#ff6600] hover:bg-orange-600 text-white shadow-lg shadow-orange-500/10 active:scale-95'
                          }`}
                        >
                          {isScraping ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-hub-gold-light" />
                              <span>جاري الفحص والكشط التلقائي عبر n8n...</span>
                            </>
                          ) : (
                            <>
                              <Radio className="w-4 h-4 animate-pulse text-hub-gold-light" />
                              <span>فحص الرابط وبدء الكشط التلقائي عبر n8n 🤖</span>
                            </>
                          )}
                        </button>
                        {isScraping && (
                          <p className="text-[10px] text-hub-gold-light text-center animate-pulse">
                            {scrapingStatus || 'نعمل على استيراد البيانات الحية...'}
                          </p>
                        )}
                        <p className="text-[9px] text-gray-400 text-right">
                          * عند إطلاق فحص الرابط عبر n8n، سيتم ملء باقي حقول النموذج تلقائياً بمقاييس الحساب الحقيقية.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {wizardSteps[currentStepIndex].type === 'select' && (
                  <select
                    name={wizardSteps[currentStepIndex].name}
                    value={formData[wizardSteps[currentStepIndex].name as keyof ClientDataInput] || 'instagram'}
                    onChange={handleInputChange}
                    className="w-full bg-[#161B22] border border-hub-border text-white text-xs md:text-sm rounded-lg p-2.5 focus:border-[#ff6600] focus:outline-none cursor-pointer transition-all"
                    id={`wizard_input_${wizardSteps[currentStepIndex].name}`}
                  >
                    {wizardSteps[currentStepIndex].options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {wizardSteps[currentStepIndex].type === 'textarea' && (
                  <textarea
                    name={wizardSteps[currentStepIndex].name}
                    rows={3}
                    placeholder={wizardSteps[currentStepIndex].placeholder}
                    value={formData[wizardSteps[currentStepIndex].name as keyof ClientDataInput] || ''}
                    onChange={handleInputChange}
                    className="w-full bg-[#161B22] border border-hub-border text-white text-xs md:text-sm rounded-lg p-2.5 focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff6600] focus:outline-none resize-none transition-all placeholder:text-gray-600 leading-normal"
                    id={`wizard_input_${wizardSteps[currentStepIndex].name}`}
                  />
                )}

                {wizardSteps[currentStepIndex].type === 'engagement_group' && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0d1117] p-3 rounded-xl border border-hub-border/50 text-right">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">متوسط الإعجابات / مقطع</label>
                      <input
                        type="text"
                        name="averageLikes"
                        placeholder="مثال: 20"
                        value={formData.averageLikes}
                        onChange={handleInputChange}
                        className="bg-[#161B22] border border-hub-border text-xs text-white rounded p-2 focus:border-[#ff6600] focus:outline-none text-right"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">متوسط التعليقات / مقطع</label>
                      <input
                        type="text"
                        name="averageComments"
                        placeholder="مثال: 3"
                        value={formData.averageComments}
                        onChange={handleInputChange}
                        className="bg-[#161B22] border border-hub-border text-xs text-white rounded p-2 focus:border-[#ff6600] focus:outline-none text-right"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">متوسط مشاركات (Shares)</label>
                      <input
                        type="text"
                        name="averageShares"
                        placeholder="مثال: 1"
                        value={formData.averageShares}
                        onChange={handleInputChange}
                        className="bg-[#161B22] border border-hub-border text-xs text-white rounded p-2 focus:border-[#ff6600] focus:outline-none text-right"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400">متوسط الحفظ (Saves)</label>
                      <input
                        type="text"
                        name="averageSaves"
                        placeholder="مثال: 4"
                        value={formData.averageSaves}
                        onChange={handleInputChange}
                        className="bg-[#161B22] border border-hub-border text-xs text-white rounded p-2 focus:border-[#ff6600] focus:outline-none text-right"
                      />
                    </div>
                  </div>
                )}

                {/* Preset Chips (Buttons) for Instant Interactive Fill */}
                {wizardSteps[currentStepIndex].presetChips && wizardSteps[currentStepIndex].presetChips!.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-hub-border/25 text-right">
                    <span className="text-[10px] text-[#ff6600]/90 block mb-2 font-bold leading-none">خيارات الإدخال السريع ⚡:</span>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {wizardSteps[currentStepIndex].presetChips!.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const fieldName = wizardSteps[currentStepIndex].name;
                            const updated = { ...formData, [fieldName]: chip };
                            setFormData(updated);
                          }}
                          className="px-2.5 py-1 text-[10px] md:text-xs rounded-full bg-slate-900/60 hover:bg-[#ff6600]/25 text-gray-300 hover:text-white border border-hub-border hover:border-[#ff6600]/40 transition-all font-semibold cursor-pointer select-none active:scale-95"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation and Submission Buttons within the chat bot */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            {/* Back button */}
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={(e) => {
                e.preventDefault();
                if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
              }}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                currentStepIndex === 0
                  ? 'bg-hub-border/20 text-gray-600 cursor-not-allowed'
                  : 'bg-[#161B22] hover:bg-slate-800 text-gray-200 border border-hub-border hover:border-gray-500'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {/* Next or Auditing trigger button */}
            {currentStepIndex < wizardSteps.length - 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentStepIndex(prev => prev + 1);
                }}
                className="px-5 py-2 rounded-lg font-bold text-white bg-[#ff6600] hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(255,102,0,0.15)] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <span>السؤال التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-lg text-xs md:text-sm font-black text-white bg-gradient-to-r from-[#ff6600] to-amber-500 hover:to-amber-600 shadow-[0_0_15px_rgba(255,102,0,0.3)] animate-pulse hover:shadow-[0_0_20px_rgba(255,102,0,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                style={{ animationDuration: '3s' }}
              >
                <Sparkles className="w-4 h-4" />
                <span>إطلاق المحرك الخوارزمي الآن</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Fields Visibility Controls Toggler */}
      <div className="flex justify-center mb-6" id="manual-fields-toggle-container">
        <button
          id="manual-fields-toggle-btn"
          type="button"
          onClick={() => setShowManualFields(!showManualFields)}
          className="text-xs font-bold px-4 py-2 bg-slate-800/40 hover:bg-slate-800 border border-hub-border rounded-full hover:border-[#ff6600] text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-orange-400" />
          <span>{showManualFields ? 'إخفاء لوحة الحقول لقصر التركيز على البوت' : 'تعديل يدوي مباشر لكامل الحقول بالأسفل'}</span>
          {showManualFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {showManualFields && (
        <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* SECTION 1: MAIN METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Client Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
              اسم العميل / العلامة التجارية <span className="text-hub-rose">*</span>
            </label>
            <input
              type="text"
              name="clientName"
              required
              placeholder="مثال: شركة إرث العقارية"
              value={formData.clientName}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-sm text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
              id="input_clientName"
            />
          </div>

          {/* Commercial Niche */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">المجال / النشاط التجاري وطبيعة العمل</label>
            <input
              type="text"
              name="niche"
              placeholder="مثال: بيع العطور الفاخرة المباشرة"
              value={formData.niche}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-sm text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
              id="input_niche"
            />
          </div>

          {/* Target Platform */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">المنصة المستهدفة بالتحليل خوارزمياً</label>
            <select
              name="platform"
              value={formData.platform}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-sm text-white rounded-lg p-2.5 focus:border-hub-accent focus:outline-none cursor-pointer"
              id="input_platform"
            >
              <option value="instagram">إنستغرام ريلز (Instagram Reels & Posts)</option>
              <option value="tiktok">تيك توك (TikTok Videos)</option>
              <option value="youtube_shorts">يوتيوب شورتس (YouTube Shorts)</option>
              <option value="x">منصة إكس (X / Twitter Content)</option>
              <option value="all">كل المنصات كحزمة متكاملة (All Platforms)</option>
            </select>
          </div>

          {/* Target Profile URL */}
          <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3 bg-hub-bg/30 border border-hub-border/50 rounded-xl p-3">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              رابط الحساب المستهدف (URL)
              <span className="text-[10px] bg-hub-accent/10 text-hub-gold-light border border-hub-accent/30 px-1.5 py-0.5 rounded-full font-bold">المدخل الأساسي لـ n8n 🤖</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <input
                type="url"
                name="profileUrl"
                placeholder="مثال: https://instagram.com/username"
                value={formData.profileUrl}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-sm text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600 font-mono text-left flex-1"
                dir="ltr"
                id="input_profileUrl"
              />
              <button
                type="button"
                disabled={isScraping || !formData.profileUrl}
                onClick={triggerN8nScraping}
                className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isScraping
                    ? 'bg-hub-border text-gray-500 cursor-not-allowed'
                    : !formData.profileUrl
                    ? 'bg-slate-800/40 text-gray-500 border border-hub-border/40 cursor-not-allowed'
                    : 'bg-[#ff6600] hover:bg-orange-600 text-white shadow-md shadow-orange-500/10 active:scale-95'
                }`}
                id="btn_trigger_n8n"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-hub-gold-light" />
                    <span>جاري الكشط عبر n8n...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 animate-pulse text-hub-gold-light" />
                    <span>فحص الرابط وبدء الكشط 🤖</span>
                  </>
                )}
              </button>
            </div>
            {isScraping && (
              <p className="text-[10px] text-hub-gold-light mt-1 animate-pulse">
                {scrapingStatus || 'جاري استيراد المقاييس وتحليل البيانات الحية...'}
              </p>
            )}
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              * عند إدخال الرابط والضغط على "فحص الرابط وبدء الكشط"، سيقوم n8n بسحب الأرقام والمقاييس من الحساب وحقنها تلقائياً في الحقول اليدوية أدناه، لتتمكن من مراجعتها وتعديلها في أي وقت قبل توليد التقرير.
            </p>
          </div>
        </div>

        {/* SECTION 2: PLATFORM NUMBERS & ALGORITHMIC RATIOS */}
        <div className="border border-hub-border bg-[#0D1117] rounded-lg p-3 lg:p-4">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5 border-b border-hub-border pb-2">
            <BarChart2 className="w-4 h-4 text-hub-gold-light" />
            الأرقام الخوارزمية الفعلية والقياسات الحيوية للجمهور
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Followers count */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">عدد المتابعين الإجمالي</label>
              <input
                type="text"
                name="followersCount"
                placeholder="مثال: 50,000"
                value={formData.followersCount}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
                id="input_followersCount"
              />
            </div>

            {/* Engagement observations */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">حجم ونشاط المجتمع الفعلي المتفاعل</label>
              <input
                type="text"
                name="activeCommunitySize"
                placeholder="مثال: أقل من 100 شخص بانتظام"
                value={formData.activeCommunitySize}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
                id="input_activeCommunitySize"
              />
            </div>

            {/* First 3s hook retention */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">نسبة الاحتفاظ في أول 3 ثوانٍ (Hook %)</label>
              <input
                type="text"
                name="first3sRetention"
                placeholder="مثال: 30% أو غير معلومة"
                value={formData.first3sRetention}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
                id="input_first3sRetention"
              />
            </div>

            {/* Video watch time completion */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400">نسبة إكمال الفيديو الكلي (Watch rate)</label>
              <input
                type="text"
                name="watchTimeCompletion"
                placeholder="مثال: 15% أو منخفض جداً"
                value={formData.watchTimeCompletion}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
                id="input_watchTimeCompletion"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Avg likes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 text-right">متوسط الإعجابات / المنشور</label>
              <input
                type="text"
                name="averageLikes"
                placeholder="مثال: 20"
                value={formData.averageLikes}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none text-right"
                id="input_averageLikes"
              />
            </div>

            {/* Avg comments */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 text-right">متوسط التعليقات / المنشور</label>
              <input
                type="text"
                name="averageComments"
                placeholder="مثال: 3"
                value={formData.averageComments}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none text-right"
                id="input_averageComments"
              />
            </div>

            {/* Avg shares */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 text-right">متوسط المشاركات (Shares) <strong className="text-hub-gold-light">(مهم)</strong></label>
              <input
                type="text"
                name="averageShares"
                placeholder="مثال: 1"
                value={formData.averageShares}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none text-right"
                id="input_averageShares"
              />
            </div>

            {/* Avg saves */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-400 text-right">متوسط المرات المحفوظة (Saves) <strong className="text-hub-gold-light">(مهم)</strong></label>
              <input
                type="text"
                name="averageSaves"
                placeholder="مثال: 0"
                value={formData.averageSaves}
                onChange={handleInputChange}
                className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2 focus:border-hub-accent focus:outline-none text-right"
                id="input_averageSaves"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: CREATIVE METHODS & CAPTION STYLE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Typical video hooks */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">أمثلة على الخطافات والعناوين (Hooks) الحالية:</label>
            <textarea
              name="contentHooksExample"
              rows={3}
              placeholder="مثال: كيف تقضي إجازتك في الرياض أو لقطات هادئة جداً بدون أي صوت"
              value={formData.contentHooksExample}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none resize-none transition-all placeholder:text-gray-600"
              id="input_contentHooksExample"
            />
          </div>

          {/* Caption and description style */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">أسلوب وصياغة الوصف (Caption) وطول المقطع التوضيحي:</label>
            <textarea
              name="contentCaptionStyle"
              rows={3}
              placeholder="مثال: نكتب فقط السعر أو نضع 20 هاشتاغاً ممتلئاً مكرراً"
              value={formData.contentCaptionStyle}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none resize-none transition-all placeholder:text-gray-600"
              id="input_contentCaptionStyle"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Posting frequency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">معدل التواجد، ونشر المحتوى ووتيرته:</label>
            <input
              type="text"
              name="postingFrequency"
              placeholder="مثال: مرة بالأسبوع بشكل غير منتظم"
              value={formData.postingFrequency}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-sm text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
              id="input_postingFrequency"
            />
          </div>

          {/* Community response / DM system */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-300">أسلوب الرد على الكومنتات والتفاعل على الخاص:</label>
            <input
              type="text"
              name="communityInteraction"
              placeholder="مثال: لا نجيب على التعليقات أو نكتب تواصل خاص دايركت"
              value={formData.communityInteraction}
              onChange={handleInputChange}
              className="bg-hub-bg border border-hub-border text-sm text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none transition-all placeholder:text-gray-600"
              id="input_communityInteraction"
            />
          </div>
        </div>

        {/* SECTION 4: DESTRUCTIVE HOLES AND OBSERVATIONS */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
            ملاحظات إضافية، صعوبات تجارية، ومشاكل مبيعات واضحة للعميل:
          </label>
          <textarea
            name="customNotes"
            rows={3}
            placeholder="مثال: الفروع والمحلات تعاني من قلة الزوار مادياً بالرغم من صرف مبالغ هائلة على مصورين محليين دون عوائد..."
            value={formData.customNotes}
            onChange={handleInputChange}
            className="bg-hub-bg border border-hub-border text-xs text-gray-100 rounded-lg p-2.5 focus:border-hub-accent focus:outline-none resize-none transition-all placeholder:text-gray-600"
            id="input_customNotes"
          />
        </div>

        {/* Dynamic warning indicator for strict rules */}
        <div className="flex items-start gap-2.5 bg-hub-gold/10 border border-hub-gold/30 rounded-xl p-3 text-xs text-hub-gold-light">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>قاعدة إطار الوكالة V1 للتدقيق:</strong> لا نجامل العميل إطلاقاً ولا نختلق بيانات. إذا تركت أي حقل فارغ أو مجهول، سيتم تدوين <strong>"لا توجد بيانات كافية للاستنتاج"</strong> في التقرير لحماية مصداقية تحليل THE HUB.
          </p>
        </div>

        {/* Submission Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 fonts-semibold text-sm transition-all shadow-lg ${
              isLoading
                ? 'bg-hub-border text-gray-500 cursor-not-allowed'
                : 'bg-hub-accent hover:bg-hub-accent-hover text-white cursor-pointer hover:shadow-blue-500/10'
            }`}
            id="audit_submit_btn"
          >
            {isLoading ? (
              <>
                <Radio className="w-4 h-4 animate-ping" />
                جاري إجراء الفحص الرقمي وحساب خوارزميات V1...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                أطلق فحص HUB V1 الخوارزمي والتجاري الآن
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
