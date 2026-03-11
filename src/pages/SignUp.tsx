import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Card from '../components/Card';

interface SignUpProps {
  onSignUpSuccess: () => void;
  onNavigateToSignIn?: () => void;
}

export default function SignUp({ onSignUpSuccess, onNavigateToSignIn }: SignUpProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!identifier || !password) {
      setError('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }

    setIsLoading(true);

    try {
      // Mock success for testing
      setTimeout(() => {
        onSignUpSuccess();
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
          <p className="text-sm text-neutral-text mt-2">إنشاء حساب جديد</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-6 text-sm text-center border border-green-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-6">
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
                <span>جاري إنشاء الحساب...</span>
              </>
            ) : (
              <span>إنشاء حساب</span>
            )}
          </button>
        </form>

        {onNavigateToSignIn && (
          <div className="mt-6 text-center">
            <button 
              onClick={onNavigateToSignIn}
              className="text-sm text-accent hover:text-primary transition-colors font-semibold"
            >
              لديك حساب بالفعل؟ تسجيل الدخول
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
