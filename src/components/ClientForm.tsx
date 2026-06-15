/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClientDataInput } from '../types';
import { PRESET_CLIENTS, PresetClient } from './presets';
import { Sparkles, BarChart2, Radio, UserCheck, HelpCircle, AlertTriangle } from 'lucide-react';

interface ClientFormProps {
  onSubmit: (data: ClientDataInput) => void;
  isLoading: boolean;
}

export default function ClientForm({ onSubmit, isLoading }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientDataInput>({
    clientName: '',
    niche: '',
    platform: 'instagram',
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

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-hub-border">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2" id="form-title">
            <Radio className="w-5 h-5 text-hub-gold-light animate-pulse" />
            تغذية بيانات فحص V1
          </h2>
          <p className="text-xs text-gray-400 mt-1">أدخل بيانات ومعايير العميل أو طبق أحد النماذج الافتراضية المعدة للتدريب والوكالة</p>
        </div>

        {/* Dropdown presets selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">نماذج تدريب جاهزة:</label>
          <select
            value={selectedPresetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="bg-hub-bg border border-hub-border text-xs rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-hub-gold transition-all cursor-pointer"
            id="preset_selector"
          >
            <option value="">-- اختر نموذج جاهز للتعبئة الفورية --</option>
            {PRESET_CLIENTS.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.niche})
              </option>
            ))}
          </select>
        </div>
      </div>

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
    </div>
  );
}
