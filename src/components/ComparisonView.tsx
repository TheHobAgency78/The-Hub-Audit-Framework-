/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditReport } from '../types';
import { BarChart, HelpCircle, AlertOctagon, Scale, ShieldCheck, Check } from 'lucide-react';

interface ComparisonViewProps {
  savedAudits: AuditReport[];
}

export default function ComparisonView({ savedAudits }: ComparisonViewProps) {
  const [selectedAuditId1, setSelectedAuditId1] = useState<string>('');
  const [selectedAuditId2, setSelectedAuditId2] = useState<string>('');

  const audit1 = savedAudits.find(a => a.id === selectedAuditId1);
  const audit2 = savedAudits.find(a => a.id === selectedAuditId2);

  const getComparisonColor = (val1: number, val2: number) => {
    if (val1 > val2) return 'text-hub-emerald bg-hub-emerald/10';
    if (val1 < val2) return 'text-hub-rose bg-hub-rose/10';
    return 'text-hub-gold-light bg-hub-gold/10';
  };

  return (
    <div className="bg-hub-card border border-hub-border rounded-lg p-4 lg:p-6 shadow-xl relative overflow-hidden" id="comparison_view_panel">
      {/* Visual Header */}
      <div className="border-b border-hub-border pb-3 mb-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-hub-gold-light" />
          مقارنة الحسابات خوارزمياً (Side-by-Side Comparison)
        </h2>
        <p className="text-xs text-gray-400 mt-1">قارن بين حسابين من الحسابات المفحوصة لتسليط الضوء على مكامن الضعف الأكثر إلحاحاً وحجم العجز التجاري المقارن</p>
      </div>

      {savedAudits.length < 2 ? (
        <div className="text-center py-12 bg-hub-bg/60 border border-hub-border border-dashed rounded-xl space-y-3">
          <HelpCircle className="w-10 h-10 text-gray-500 mx-auto animate-pulse" />
          <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
            لم نجد تقارير كافية للمقارنة. الرجاء إجراء <strong>فحصين رقميين حقيقيين (2 audits)</strong> على الأقل أو تطبيق النماذج وسيكون الخيار متاحاً للمقارنة المباشرة فوراً.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparative Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-gray-400">الحساب الأول (المقارن به):</label>
              <select
                value={selectedAuditId1}
                onChange={(e) => {
                  setSelectedAuditId1(e.target.value);
                  if (e.target.value === selectedAuditId2) setSelectedAuditId2('');
                }}
                className="w-full bg-hub-bg border border-hub-border text-xs rounded-lg p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-hub-accent cursor-pointer"
                id="compare_select_1"
              >
                <option value="">-- اختر الحساب الأول --</option>
                {savedAudits.map(audit => (
                  <option key={audit.id} value={audit.id}>
                    {audit.inputData.clientName} ({audit.inputData.niche}) - الدرجة: {audit.hubScore}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-gray-400">الحساب الثاني (المستهدف بالمقارنة):</label>
              <select
                value={selectedAuditId2}
                onChange={(e) => {
                  setSelectedAuditId2(e.target.value);
                  if (e.target.value === selectedAuditId1) setSelectedAuditId1('');
                }}
                className="w-full bg-hub-bg border border-hub-border text-xs rounded-lg p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-hub-accent cursor-pointer"
                id="compare_select_2"
              >
                <option value="">-- اختر الحساب الثاني --</option>
                {savedAudits.map(audit => (
                  <option key={audit.id} value={audit.id}>
                    {audit.inputData.clientName} ({audit.inputData.niche}) - الدرجة: {audit.hubScore}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparative analysis rendering */}
          {audit1 && audit2 ? (
            <div className="space-y-6 pt-4" id="comparison_matrix">
              {/* Score comparisons badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">مجموع درجات V1 SCORE</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-lg font-black text-hub-accent">{audit1.hubScore}</span>
                    <span className="text-xs text-gray-400">vs</span>
                    <span className="text-lg font-black text-hub-gold-light">{audit2.hubScore}</span>
                  </div>
                </div>

                <div className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">مستوى تماسك البيانات</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-xs font-bold text-hub-accent">{audit1.confidenceScore}%</span>
                    <span className="text-xs text-gray-400">vs</span>
                    <span className="text-xs font-bold text-hub-gold-light">{audit2.confidenceScore}%</span>
                  </div>
                </div>

                <div className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">الاختناقات التشغيلية المكتشفة</span>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-xs font-bold text-hub-rose">{audit1.bottlenecks.length} مشاكل</span>
                    <span className="text-xs text-gray-400">vs</span>
                    <span className="text-xs font-bold text-hub-rose">{audit2.bottlenecks.length} مشاكل</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side SVG Bar Charts for Dimensions */}
              <div className="bg-[#0D1117] border border-hub-border rounded-lg p-4">
                <h3 className="text-xs font-black text-white mb-4">مخطط مقارنة المحاور الخوارزمية المتشعبة</h3>
                
                <div className="space-y-4">
                  {audit1.dimensions.map((dim1, idx) => {
                    const dim2 = audit2.dimensions[idx] || { score: 0 };
                    const diff = dim1.score - dim2.score;
                    return (
                      <div key={idx} className="space-y-2 pb-3 border-b border-hub-border/50 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{dim1.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getComparisonColor(dim1.score, dim2.score)}`}>
                            {diff > 0 ? `+${diff} لصالح الأول` : diff < 0 ? `${diff} لصالح الثاني` : 'متطابق خوارزمياً'}
                          </span>
                        </div>

                        {/* Comparative double bar chart */}
                        <div className="space-y-1">
                          {/* Bar 1 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-500 w-24 truncate text-left">{audit1.inputData.clientName}</span>
                            <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-hub-accent rounded-full transition-all" style={{ width: `${dim1.score * 10}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 w-6 text-right font-bold">{dim1.score}</span>
                          </div>

                          {/* Bar 2 */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-500 w-24 truncate text-left">{audit2.inputData.clientName}</span>
                            <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-hub-gold rounded-full transition-all" style={{ width: `${dim2.score * 10}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 w-6 text-right font-bold">{dim2.score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Suggested Services Intersection comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                  <h4 className="text-xs font-black text-hub-accent mb-2">{audit1.inputData.clientName} (الخدمات المستهدفة):</h4>
                  <ul className="space-y-1 text-xs text-gray-300">
                    {audit1.recommendedServices.map((srv, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-hub-accent flex-shrink-0" />
                        <span>{srv.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#0D1117] border border-hub-border rounded-lg p-3">
                  <h4 className="text-xs font-black text-hub-gold-light mb-2">{audit2.inputData.clientName} (الخدمات المستهدفة):</h4>
                  <ul className="space-y-1 text-xs text-gray-300">
                    {audit2.recommendedServices.map((srv, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-hub-gold-light flex-shrink-0" />
                        <span>{srv.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-hub-bg/20 rounded-xl">
              <p className="text-xs text-gray-500">اختر حسابين من القائمة المنسدلة أعلاه لبناء لوحة مقارنة خوارزمية جافة والبدء بالتوجيهات.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
