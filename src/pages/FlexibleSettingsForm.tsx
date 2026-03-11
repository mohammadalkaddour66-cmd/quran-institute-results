import React, { useState, useRef } from 'react';
import { Settings, UploadCloud, CheckCircle2, Type, Image as ImageIcon, MessageSquare, Monitor } from 'lucide-react';
import Card from '../components/Card';

const defaultSettings = {
  fontFamily: 'Cairo',
  fontSize: 16,
  signatureImage: null as string | null,
  eventBackground: 'default',
  welcomeText: 'مرحباً بكم في نظام إدارة معهد جامع سليمان الأيوبي',
};

const backgrounds = [
  { id: 'default', name: 'الافتراضية', color: 'bg-background' },
  { id: 'ramadan', name: 'رمضان المبارك', color: 'bg-emerald-50' },
  { id: 'eid', name: 'عيد الفطر / الأضحى', color: 'bg-amber-50' },
  { id: 'national', name: 'مناسبة وطنية', color: 'bg-slate-50' },
];

export default function FlexibleSettingsForm() {
  const [settings, setSettings] = useState(defaultSettings);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: name === 'fontSize' ? parseInt(value) : value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          signatureImage: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCancel = () => {
    setSettings(defaultSettings);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4 flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Settings size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">الإعدادات المرنة</h2>
            <p className="text-neutral-text mt-1">تخصيص المظهر، الخطوط، الخلفيات، والعبارات الترحيبية للنظام.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-soft-secondary/30 pb-2">
                <Type size={20} className="text-accent" />
                إعدادات الخط
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">نوع الخط</label>
                  <select
                    name="fontFamily"
                    value={settings.fontFamily}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
                  >
                    <option value="Cairo">Cairo</option>
                    <option value="Tajawal">Tajawal</option>
                    <option value="Arial">Arial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-primary mb-2">
                    حجم الخط الأساسي ({settings.fontSize}px)
                  </label>
                  <input
                    type="range"
                    name="fontSize"
                    min="12"
                    max="24"
                    value={settings.fontSize}
                    onChange={handleChange}
                    className="w-full h-2 bg-soft-secondary/50 rounded-lg appearance-none cursor-pointer accent-accent mt-3"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-soft-secondary/30 pb-2">
                <ImageIcon size={20} className="text-accent" />
                خلفيات المناسبات
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {backgrounds.map(bg => (
                  <div 
                    key={bg.id}
                    onClick={() => setSettings(prev => ({ ...prev, eventBackground: bg.id }))}
                    className={`cursor-pointer rounded-lg border-2 p-2 text-center transition-all ${
                      settings.eventBackground === bg.id 
                        ? 'border-accent bg-accent/5' 
                        : 'border-soft-secondary/30 hover:border-accent/50'
                    }`}
                  >
                    <div className={`w-full h-12 rounded ${bg.color} border border-soft-secondary/20 mb-2`}></div>
                    <span className="text-xs font-semibold text-primary">{bg.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-soft-secondary/30 pb-2">
                <MessageSquare size={20} className="text-accent" />
                العبارات الترحيبية
              </h3>
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">نص الترحيب في لوحة التحكم</label>
                <textarea
                  name="welcomeText"
                  value={settings.welcomeText}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 resize-none"
                  placeholder="أدخل العبارة الترحيبية..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-soft-secondary/30 pb-2">
                <UploadCloud size={20} className="text-accent" />
                توقيع الشعار / الختم
              </h3>
              <div 
                className="flex justify-center px-6 pt-5 pb-6 border-2 border-soft-secondary/50 border-dashed rounded-xl hover:bg-background/50 hover:border-accent transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-2 text-center">
                  <UploadCloud className="mx-auto h-10 w-10 text-neutral-text group-hover:text-accent transition-colors" />
                  <div className="text-sm text-primary font-semibold">
                    <span>اضغط لرفع صورة الختم أو التوقيع</span>
                  </div>
                  <p className="text-xs text-neutral-text">
                    PNG شفافة موصى بها (حتى 2MB)
                  </p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png, image/jpeg"
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2 border-b border-soft-secondary/30 pb-2">
              <Monitor size={20} className="text-accent" />
              معاينة حية
            </h3>
            <div 
              className={`border border-soft-secondary/50 rounded-xl p-6 min-h-[400px] flex flex-col transition-colors duration-500 ${
                backgrounds.find(b => b.id === settings.eventBackground)?.color || 'bg-background'
              }`}
              style={{ 
                fontFamily: settings.fontFamily,
                fontSize: `${settings.fontSize}px`
              }}
            >
              <div className="flex items-center justify-between border-b border-primary/10 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-soft-secondary flex items-center justify-center text-primary font-bold">
                    ج
                  </div>
                  <span className="font-bold text-primary">معهد جامع سليمان الأيوبي</span>
                </div>
              </div>
              <div className="flex-1 space-y-6">
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-lg shadow-sm border border-white/20">
                  <h4 className="font-bold text-primary mb-2" style={{ fontSize: `${settings.fontSize * 1.25}px` }}>
                    {settings.welcomeText}
                  </h4>
                  <p className="text-neutral-text leading-relaxed">
                    هذا النص هو مجرد مثال لمعاينة كيف سيبدو المحتوى بالخط والحجم المختارين. يمكنك تعديل الإعدادات من اللوحة الجانبية وملاحظة التغيير فوراً.
                  </p>
                </div>
                <div className="mt-auto pt-8 flex justify-end">
                  <div className="text-center">
                    <p className="text-primary font-semibold mb-2">الختم المعتمد</p>
                    {settings.signatureImage ? (
                      <img 
                        src={settings.signatureImage} 
                        alt="التوقيع" 
                        className="max-h-24 object-contain border border-dashed border-soft-secondary/50 p-2 rounded"
                      />
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-soft-secondary/50 rounded flex items-center justify-center text-neutral-text text-sm bg-white/50">
                        لا يوجد ختم
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-8 mt-8 border-t border-soft-secondary/30">
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors"
          >
            حفظ الإعدادات
          </button>
          <button
            onClick={handleCancel}
            className="px-8 py-3 bg-soft-secondary hover:bg-[#c8b996] text-primary font-bold rounded-lg transition-colors"
          >
            إلغاء واستعادة الافتراضي
          </button>
        </div>
      </Card>

      {showToast && (
        <div className="fixed bottom-8 left-8 bg-primary text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-accent" size={24} />
          <span className="font-semibold">تم حفظ الإعدادات بنجاح!</span>
        </div>
      )}
    </div>
  );
}
