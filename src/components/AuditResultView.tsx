import React, { useState, useEffect } from 'react';

// مكوّن إدارة مفتاح الـ API وحفظه محلياً في المتصفح/الهاتف
const ApiKeyManager: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('THE_HUB_GEMINI_KEY');
    if (saved) {
      setKeyInput(saved);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (keyInput.trim()) {
      localStorage.setItem('THE_HUB_GEMINI_KEY', keyInput.trim());
      setIsSaved(true);
      alert('✅ تم حفظ مفتاح Gemini بأمان في ذاكرة جهازك الحالية!');
    } else {
      localStorage.removeItem('THE_HUB_GEMINI_KEY');
      setIsSaved(false);
      alert('🗑️ تم مسح المفتاح من الجهاز.');
    }
  };

  return (
    <div style={{ padding: '20px', background: '#111827', borderRadius: '12px', marginTop: '30px', border: '1px solid #374151', textAlign: 'right', direction: 'rtl' }}>
      <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '16px' }}>🔐 إعدادات الوصول الآمن (خاص بالمدير)</h3>
      <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>
        يتم حفظ هذا المفتاح محلياً في ذاكرة هاتفك أو تطبيقك الحالي فقط، ولا يتم رفعه أو مشاركته مع أي خوادم خارجية لضمان حمايته التامة.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="أدخل مفتاح GEMINI_API_KEY هنا..."
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #4b5563', background: '#1f2937', color: '#fff', fontSize: '14px' }}
        />
        <button
          onClick={handleSave}
          style={{ padding: '12px 24px', borderRadius: '8px', background: isSaved ? '#10b981' : '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          {isSaved ? 'تحديث المفتاح' : 'حفظ في الجهاز'}
        </button>
      </div>
    </div>
  );
};

// المكوّن الرئيسي لعرض نتائج الفحص وتوليد التقارير
export const AuditResultView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartAudit = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const apiKey = localStorage.getItem('THE_HUB_GEMINI_KEY');

    if (!apiKey) {
      setError('فشل إكمال الفحص الرقمي: يرجى التأكد من إدخال مفتاح GEMINI_API_KEY وحفظه في لوحة الإعدادات أسفل الصفحة.');
      setLoading(false);
      return;
    }

    try {
      const auditPrompt = "قم بعمل فحص خوارزمي رقمي شامل وحلل الثغرات بناءً على البيانات المدخلة لوكالة التجارة الإلكترونية والملابس المقترحة.";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: auditPrompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('فشل الاستجابة من خوادم Google API. تأكد من صلاحية المفتاح.');
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setReport(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('لم يتم إرجاع بيانات صحيحة من النموذج.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء معالجة البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
      
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#f87171', direction: 'rtl' }}>
          <p style={{ fontWeight: 'bold' }}>⚠️ تنبيه خطأ:</p>
          <p style={{ fontSize: '14px', marginTop: '5px' }}>{error}</p>
        </div>
      )}

      <div style={{ background: '#1f2937', padding: '25px', borderRadius: '12px', border: '1px solid #374151', textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '10px' }}>📊 الفحص الأول خوارزمياً لقسم تطلعات حسابات العملاء</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
          لا تهاون ولا مجاملة. فكك حساب عميلك بالأرقام، واستر على ثغرات النشر وفجوة ثقة الجمهور خوارزمياً.
        </p>

        <button
          onClick={handleStartAudit}
          disabled={loading}
          style={{ padding: '12px 30px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', border: 'none', background: loading ? '#4b5563' : '#4f46e5', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳ جاري معالجة البيانات وتوليد التقرير...' : '🚀 ابدأ الفحص الخوارزمي الآن'}
        </button>
      </div>

      {report && (
        <div style={{ marginTop: '25px', background: '#111827', padding: '20px', borderRadius: '12px', border: '1px solid #10b981', direction: 'rtl', lineHeight: '1.6' }}>
          <h3 style={{ color: '#10b981', marginBottom: '10px' }}>📄 التقرير الرقمي المولد من THE HUB:</h3>
          <div style={{ whiteSpace: 'pre-wrap', color: '#e5e7eb' }}>{report}</div>
        </div>
      )}

      <ApiKeyManager />
      
    </div>
  );
};

export default AuditResultView;
