/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Deriving ESM equivalents of globals since we run under ESM or bundle environments safely
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function for lazy initialization of GoogleGenAI
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing. Please add it in your Secrets / Env Variables.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiWithFallback(ai: GoogleGenAI, prompt: string): Promise<string> {
  const modelsToTry = [
    { name: 'gemini-3.5-flash', useRetry: true, maxAttempts: 2 },
    { name: 'gemini-3.1-flash-lite', useRetry: true, maxAttempts: 2 },
    { name: 'gemini-flash-latest', useRetry: true, maxAttempts: 2 }
  ];

  let lastError: any = null;

  for (const modelConfig of modelsToTry) {
    const modelName = modelConfig.name;
    const maxAttempts = modelConfig.maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Gemini Engine] Attempting generation with ${modelName} (Attempt ${attempt}/${maxAttempts})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.15,
            systemInstruction: "أنت المحلل الرقمي واستشاري النمو الأول لوكالة THE HUB. أسلوبك حاسم، جاف، خوارزمي وتجاري بحت. لا تجامل ولا تحفز ولا تعتذر. استعن بعلم خوارزميات المنصات الحديثة بالكامل. جميع المخرجات باللغة العربية بدقة متناهية.",
          },
        });

        const textResponse = response.text;
        if (textResponse && textResponse.trim()) {
          let cleaned = textResponse.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
          }
          cleaned = cleaned.trim();
          
          // Pre-validate that the model returned perfectly valid JSON
          JSON.parse(cleaned);
          
          console.log(`[Gemini Engine] Successfully generated and verified valid JSON audit content with model ${modelName} on attempt ${attempt}`);
          return cleaned;
        }
        throw new Error('Received an empty response from Gemini.');
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || '';
        const errStr = typeof err === 'string' ? err : JSON.stringify(err);
        console.warn(`[Gemini Engine] Transient challenge with model ${modelName} on attempt ${attempt}:`, errMsg || errStr);

        const combinedErrorString = `${errMsg} ${errStr} ${err.status || ''} ${err.statusCode || ''}`.toUpperCase();
        const isOverloaded = combinedErrorString.includes('503') || 
                             combinedErrorString.includes('UNAVAILABLE') || 
                             combinedErrorString.includes('HIGH DEMAND') || 
                             combinedErrorString.includes('OVERLOADED') ||
                             combinedErrorString.includes('TEMPORARILY') ||
                             err.status === 503 || err.statusCode === 503;

        const isRetriable = isOverloaded || 
                            combinedErrorString.includes('RATE LIMIT') || 
                            combinedErrorString.includes('429') ||
                            combinedErrorString.includes('RESOURCE EXHAUSTED') ||
                            err.status === 429 || err.statusCode === 429;

        // If the model is overloaded or UNAVAILABLE, we immediately transition to the next healthy model
        // rather than performing slow retries on an already congested model.
        const canRetryThisModel = isRetriable && !isOverloaded;

        if (canRetryThisModel && attempt < maxAttempts) {
          // Robust backoff with jitter to reduce congestion: 1s -> 2s + random jitter
          const waitTime = (attempt * 1000) + Math.floor(Math.random() * 500) + 100;
          console.warn(`[Gemini Engine] Rate limit/Resource limit transient error. Retrying ${modelName} in ${waitTime}ms...`);
          await delay(waitTime);
        } else {
          const reason = isOverloaded ? 'model is overloaded/unavailable (503)' : 'unsupported error or max attempts reached';
          console.warn(`[Gemini Engine] Instantly falling back from ${modelName} to the next model. Reason: ${reason}`);
          break; // break the attempt loop, moves to fallback model
        }
      }
    }
  }

  throw lastError || new Error('All Gemini generation attempts failed.');
}

// REST route for performing the HUB audit
app.post('/api/audit', async (req, res) => {
  try {
    const clientData = req.body;
    if (!clientData || !clientData.clientName) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const ai = getGeminiClient();

    // Construct the prompt in Arabic detailing the HUB framework requirements
    const prompt = `
أنت الآن "محلل رقمي واستشاري نمو" مخصص لوكالة THE HUB. مهمتك هي إخضاع بيانات حساب العميل لفحص رقمي وتجاري صارم بناءً على إطار عمل الوكالة المعتمد وعلم خوارزميات منصات التواصل الاجتماعي الحديثة (Instagram, TikTok, YouTube Shorts, X).

[قواعد صارمة لتقليل استهلاك البيانات والـ Tokens - كفاءة واختصار]:
- اكتب بالكامل بلغة برقية مكثفة ومباشرة (High Density, Low Verbosity).
- ممنوع تماماً الحشو، التكرار، أو شرح البديهيات وخوارزميات المنصات بشكل نظري؛ ادخل في المشكلة والحل مباشرة للعميل.
- استخدم صيغاً برقية قصيرة، نقاطاً مركزة للغاية بدلاً من الفقرات الطويلة.
- في حقول "المرحلة 2" (bottlenecks) و"المرحلة 3" (opportunities): اكتب التشخيص والأثر والحل في جمل برقية قصيرة جداً ومباشرة دون مقدمات أو تمهيد لكل نقطة.
- إذا كانت هناك مشكلتان تتشابهان في الأثر، ادمجهما في نقطة واحدة فوراً لتوفير المساحة والجمالية الفنية.
- إذا كانت البيانات المتاحة غير كافية لتقييم أي زاوية أو إعطاء رقم تجاري دقيق، اكتب فقط: "لا توجد بيانات كافية" للاختصار وحيوية التحليل.

بيانات العميل المقدمة:
- اسم العميل: ${clientData.clientName}
- المجال/النشاط التجاري: ${clientData.niche || 'غير محدد'}
- المنصة الأساسية المستهدفة بالتحليل: ${clientData.platform || 'غير محدد'}
- عدد المتابعين الحاليين: ${clientData.followersCount || 'غير محدد'}
- حجم المجتمع المتفاعل ونشاطه: ${clientData.activeCommunitySize || 'غير محدد'}
- نسبة الاحتفاظ في أول 3 ثوانٍ (Hook Retention): ${clientData.first3sRetention || 'غير محدد'}
- متوسط نسبة إكمال الفيديو (Watch Time): ${clientData.watchTimeCompletion || 'غير محدد'}
- متوسط الإعجابات لكل منشور: ${clientData.averageLikes || 'غير محدد'}
- متوسط التعليقات لكل منشور: ${clientData.averageComments || 'غير محدد'}
- متوسط المشاركات (Shares) لكل منشور: ${clientData.averageShares || 'غير محدد'}
- متوسط الحفظ (Saves) لكل منشور: ${clientData.averageSaves || 'غير محدد'}
- أمثلة على الخطافات (Hooks) المستخدمة حالياً: ${clientData.contentHooksExample || 'غير محدد'}
- أسلوب وطول المقطع التوضيحي (Caption Style): ${clientData.contentCaptionStyle || 'غير محدد'}
- معدل النشر وانتظام المحتوى: ${clientData.postingFrequency || 'غير محدد'}
- أسلوب التفاعل مع المجتمع والردود: ${clientData.communityInteraction || 'غير محدد'}
- ملاحظات إضافية وعثرات معروفة: ${clientData.customNotes || 'غير محدد'}

الرجاء إجراء التحليل وفق المراحل السبع لإطار عمل THE HUB V1 بدقة ومعايير عالية الكفاءة.

يجب أن تقوم بإنشاء الإخراج بصيغة JSON مطابقة تماماً للمواصفات التالية. لا تُضف أي نصوص مقدمة أو خاتمة خارج كائن الـ JSON.

مواصفات هيكل الـ JSON المطلوبة:
{
  "confidenceScore": <رقم بين 0 و100 يمثل درجة الموثوقية بالبيانات الحالية لتقديم فحص دقيق>,
  "missingDataPoints": ["قائمة بالبيانات الهامة الناقصة المباشرة"],
  "assumptions": ["الافتراضات الأساسية المفروضة للاختبار إن وجدت"],
  "hubScore": <رقم كلي بين 1 و100 يعبر عن الكفاءة الرقمية الشاملة للحساب بناء على الجوانب العشرة التالية>,
  "dimensions": [
    {
      "name": "قوة الخطاف (Hook Strength)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "تحسين الاحتفاظ وصناعة الامتداد (Retention Optimization)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "التحفيز على المشاركة والحفظ (Share & Save Engine)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "بناء المجتمع وتفعيل الجمهور (Community Building)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "الهوية البصرية والتموضع (Identity & Positioning)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "انتظام النشر وتخطيط المحتوى (Consistency & Output)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "الربط التجاري ومسارات التسييل (Sales Funnels)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "إمكانية الرعاية والتمويل (Sponsorship Readiness)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "التناغم مع معايير الخوارزمية (Algorithmic Harmony)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    },
    {
      "name": "كفاءة محرك النمو الإجمالي (Growth Engine Efficiency)",
      "score": <رقم من 1 لـ 10>,
      "analysis": "<جملة تحليل برقية مكثفة ومباشرة>"
    }
  ],
  "bottlenecks": [
    // يجب توفير 5 إلى 7 نقاط كاملة (مدمجة ومكثفة) من الاختناقات والمشاكل المرتبة حسب الأثر الرقمي والتجاري بترتيب من الأكثر سلبية (1) إلى الأدقل.
    {
      "rank": 1,
      "title": "<عنوان المشكلة برقي مباشر>",
      "description": "<شرح المشكلة في جملة واحدة مكثفة>",
      "algorithmicImpact": "<الأثر الخوارزمي بجملة قصيرة للغاية>",
      "commercialImpact": "<الأثر المالي/التجاري بجملة قصيرة للغاية>"
    }
  ],
  "opportunities": [
    // قائمة من 3 فرص كامنة فورية ذات عوائد عالية ورشحها للعميل
    {
      "title": "<عنوان الفرصة>",
      "rationale": "<شرح الأهمية بجملة قصيرة مباشرة>",
      "expectedDigitalReturn": "<العائد الرقمي المتوقع بجملة واحدة>",
      "expectedCommercialReturn": "<العائد المالي والمتوقع بجملة واحدة>",
      "easeOfImplementation": "<سهل أو متوسط أو صعب>"
    }
  ],
  "strategicQuestions": [
    // 5 أسئلة استراتيجية جريئة وحاسمة يتم طرحها في اجتماع البيع لانتزاع تفاصيل الميزانية ومصادر التعطيل والعقود
    "<الميزانية والتصوير؟>",
    "<المؤثرين والانتظام؟>",
    "<أتمتة المبيعات والرسائل؟>",
    "<سلاسل المحتوى وقنوات التسييل؟>",
    "<الاستثمار الإعلاني المباشر؟>"
  ],
  "quickWins": [
    // قائمة بـ 3 إجراءات عملية للـ 30 يوماً القادمة
    {
      "title": "<عنوان برقي للإجراء السريع>",
      "description": "<تفاصيل قصيرة جداً ومباشرة للتطبيق>",
      "implementationCost": "<منخفضة أو متوسطة>",
      "impactLevel": "<عالي جداً أو عالي أو متوسط>",
      "timeframeDays": <عدد الأيام اللازم لتطبيقه كـ 5 أو 10 أو 15 أو 30>
    }
  ],
  "plan90Days": [
    // خطة 90 يوماً مقسمة لثلاثة أشهر
    {
      "month": 1,
      "objectives": ["أهداف مكثفة للشهر الأول"],
      "actions": ["إجراءات الشهر الأول الفنية المباشرة والمكثفة"],
      "kpis": ["مؤشر قياس النجاح برقي"]
    },
    {
      "month": 2,
      "objectives": ["أهداف مكثفة للشهر الثاني"],
      "actions": ["إجراءات الشهر الثاني الفنية المباشرة والمكثفة"],
      "kpis": ["مؤشر قياس النجاح برقي"]
    },
    {
      "month": 3,
      "objectives": ["أهداف مكثفة للشهر الثالث"],
      "actions": ["إجراءات الشهر الثالث الفنية المباشرة والمكثفة"],
      "kpis": ["مؤشر قياس النجاح برقي"]
    }
  ],
  "recommendedServices": [
    // ربط الاختناقات بـ خدمات وكالة THE HUB الست المتاحة مع الشرح الفني
    // الخدمات الست هي حصراً:
    // 1. content_strategy: هندسة المحتوى وكتابة السيناريو الخوارزمي
    // 2. video_production: إنتاج الفيديو المتكامل والمونتاج الخوارزمي
    // 3. organic_growth: تهيئة الحسابات وهندسة النمو المجاني
    // 4. campaign_strategy: تصميم خطط الإعلانات الممولة والحملات المقترحة
    // 5. brand_positioning: تطوير الهوية البصرية ومواقع التموضع
    // 6. sales_funnel: بناء القنوات البيعية وأتمتة العمليات التجارية
    // الرجاء اختيار وتبرير الخدمات الأكثر إلحاحاً التي تفيد العميل مباشرة لحل أكبر اختناقاته المتمثلة في التقرير.
    {
      "serviceId": "<مستمد حصراً من المعرفات الست المذكورة أعلاه>",
      "name": "<اسم الخدمة المطابقة باللغة العربية>",
      "whyApplied": "<كيف تحل العجز الخوارزمي باقتضاب كامل>",
      "expectedValue": "<العائد المالي المباشر بجملة قصيرة حاسمة>"
    }
  ]
}
`;

    const textResponse = await callGeminiWithFallback(ai, prompt);

    // Parse the response so we can enrich it with metadata
    const parsedData = JSON.parse(textResponse.trim());
    
    // Add server-side unique ID and Timestamp
    const finalReport = {
      id: `hub-audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      inputData: clientData,
      ...parsedData
    };

    return res.json(finalReport);

  } catch (error: any) {
    console.error('Audit API error:', error);
    return res.status(500).json({ 
      error: 'حدث خطأ أثناء إجراء الفحص الرقمي الرقمي المتقدم من خادم المحاكاة للغرفة.', 
      details: error.message 
    });
  }
});

// Path to store shared reports
const SHARED_REPORTS_FILE = path.join(process.cwd(), 'shared_reports.json');

// Helper to read shared reports
function readSharedReports(): Record<string, any> {
  try {
    if (fs.existsSync(SHARED_REPORTS_FILE)) {
      const data = fs.readFileSync(SHARED_REPORTS_FILE, 'utf8');
      return JSON.parse(data || '{}');
    }
  } catch (e) {
    console.error('Error reading shared reports file:', e);
  }
  return {};
}

// Helper to write shared reports
function writeSharedReports(data: Record<string, any>) {
  try {
    fs.writeFileSync(SHARED_REPORTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing shared reports file:', e);
  }
}

// API to save a report for sharing
app.post('/api/share', (req, res) => {
  try {
    const { report } = req.body;
    if (!report || !report.id) {
      return res.status(400).json({ error: 'Report data with ID is required' });
    }

    const reports = readSharedReports();
    // Save report in file
    reports[report.id] = report;
    writeSharedReports(reports);

    console.log(`[Share Engine] Report stored successfully. Share ID: ${report.id}`);
    return res.json({ shareId: report.id });
  } catch (e: any) {
    console.error('Error sharing report:', e);
    return res.status(500).json({ error: 'Failed to share report on server', details: e.message });
  }
});

// API to load a shared report
app.get('/api/share/:id', (req, res) => {
  try {
    const { id } = req.params;
    const reports = readSharedReports();
    const report = reports[id];

    if (!report) {
      return res.status(404).json({ error: 'التقرير المطلوب غير موجود أو انتهت صلاحيته.' });
    }

    return res.json(report);
  } catch (e: any) {
    console.error('Error loading shared report:', e);
    return res.status(500).json({ error: 'Error loading shared report', details: e.message });
  }
});

// Serving UI assets
if (process.env.NODE_ENV !== 'production') {
  createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  }).then((vite) => {
    app.use(vite.middlewares);
    
    // Fallback error handlers or custom assets can go here
    app.use('*', (req, res, next) => {
      // Direct asset requests or reload correctly
      next();
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Development Server running on port ${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}
