import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Card from '../components/Card';

interface SignInProps {
  onLoginSuccess: () => void;
  onNavigateToSignUp?: () => void;
}

export default function SignIn({ onLoginSuccess, onNavigateToSignUp }: SignInProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier || !password) {
      setError('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }

    // Demo login bypass
    if (identifier === 'demo' && password === 'demo123') {
      setIsLoading(true);
      // We'll simulate a successful login by calling onLoginSuccess
      // Note: This won't create a real Supabase session, so we need to handle this in App.tsx
      setTimeout(() => {
        onLoginSuccess();
        setIsLoading(false);
      }, 1000);
      return;
    }

    setIsLoading(true);

    try {
      // Mock successful login for any credentials
      setTimeout(() => {
        onLoginSuccess();
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-md">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.png" 
            alt="شعار المعهد" 
            className="max-h-[80px] object-contain mb-6 mx-auto"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl font-bold text-primary text-center">
            نظام إدارة معهد جامع سليمان الأيوبي
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700 text-center">
              للتجربة السريعة، استخدم: <br/>
              اسم المستخدم: <span className="font-mono font-bold">demo</span> | 
              كلمة المرور: <span className="font-mono font-bold">demo123</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              رقم الهاتف أو الرقم الوطني
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-soft-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-white"
              placeholder="أدخل رقم الهاتف أو الرقم الوطني"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-soft-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all bg-white"
                placeholder="أدخل كلمة المرور"
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-text hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent hover:bg-[#a88254] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>
        
        {onNavigateToSignUp && (
          <div className="mt-6 text-center">
            <button 
              onClick={onNavigateToSignUp}
              className="text-sm text-accent hover:text-primary transition-colors font-semibold"
            >
              ليس لديك حساب؟ إنشاء حساب جديد
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
