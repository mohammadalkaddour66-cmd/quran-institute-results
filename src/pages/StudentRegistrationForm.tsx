import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/Card';
import { API_URL, addToOfflineQueue } from '../utils/syncUtils';

export default function StudentRegistrationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    birthDateAndPlace: '',
    currentResidence: '',
    phoneNumber: '',
    fatherProfession: '',
    isOrphan: false,
    registrationDate: new Date().toISOString().split('T')[0],
  });

  const [profilePicture, setProfilePicture] = useState<{name: string, base64: string} | null>(null);
  const [familyBookPicture, setFamilyBookPicture] = useState<{name: string, base64: string} | null>(null);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Compress and convert image to Base64
  const compressImage = (file: File, maxWidth: number = 1000, maxHeight: number = 1000): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality to keep payload small
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImage(file);
        setProfilePicture({ name: file.name, base64 });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleFamilyBookChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImage(file);
        setFamilyBookPicture({ name: file.name, base64 });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const calculateAge = (birthInfo: string) => {
    const dateMatch = birthInfo.match(/\d{4}-\d{2}-\d{2}/) || birthInfo.match(/\d{4}\/\d{2}\/\d{2}/);
    if (!dateMatch) return null;
    
    const birthDateStr = dateMatch[0].replace(/\//g, '-');
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.clear();
    
    setError('');
    setShowSuccess(false);

    // Validation: check if any required field is empty
    const requiredFields = [
      'fullName', 'fatherName', 'motherName', 'birthDateAndPlace',
      'currentResidence', 'phoneNumber', 'fatherProfession',
      'registrationDate'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (emptyFields.length > 0) {
      setError('الرجاء تعبئة جميع الحقول الأساسية المطلوبة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    let personalPhotoBase64 = profilePicture ? profilePicture.base64 : "";
    let familyBookPhotoBase64 = familyBookPicture ? familyBookPicture.base64 : "";

    const googleSheetData = {
      baseName: "الطلاب",
      timestamp: new Date().getTime(),
      values: [
        formData.fullName,
        formData.fatherName,
        formData.motherName,
        formData.birthDateAndPlace,
        formData.currentResidence,
        formData.phoneNumber,
        formData.fatherProfession,
        formData.registrationDate,
        personalPhotoBase64,
        familyBookPhotoBase64,
        formData.isOrphan ? "نعم" : "لا",
        "" // Index 11: اسم الحلقة (Group Name)
      ]
    };

    // Optimistic Reset
    setShowSuccess(true);
    setFormData({
      fullName: '',
      fatherName: '',
      motherName: '',
      birthDateAndPlace: '',
      currentResidence: '',
      phoneNumber: '',
      fatherProfession: '',
      isOrphan: false,
      registrationDate: new Date().toISOString().split('T')[0],
    });
    setProfilePicture(null);
    setFamilyBookPicture(null);
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);

    // Background Execution
    if (!navigator.onLine) {
      addToOfflineQueue(googleSheetData);
    } else {
      console.log("Sending Data in background...", googleSheetData);
      fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(googleSheetData),
        mode: "no-cors"
      }).then(() => {
        console.log("Data Sent Successfully in background");
      }).catch((err) => {
        console.error("Error submitting form in background:", err);
        addToOfflineQueue(googleSheetData); // Fallback to queue
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: '',
      fatherName: '',
      motherName: '',
      birthDateAndPlace: '',
      currentResidence: '',
      phoneNumber: '',
      fatherProfession: '',
      isOrphan: false,
      registrationDate: new Date().toISOString().split('T')[0],
    });
    setProfilePicture(null);
    setFamilyBookPicture(null);
    setError('');
    setShowSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4">
          <h2 className="text-2xl font-bold text-primary">تسجيل طالب جديد</h2>
          <p className="text-neutral-text mt-2">يرجى إدخال بيانات الطالب بدقة في الحقول المخصصة.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الاسم الكامل */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">الاسم الكامل</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="الاسم"
              />
            </div>

            {/* اسم الأب */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">اسم الأب</label>
              <input
                type="text"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="اسم الأب"
              />
            </div>

            {/* اسم الأم */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">اسم الأم</label>
              <input
                type="text"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="اسم الأم والكنية"
              />
            </div>

            {/* تاريخ ومكان الولادة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">تاريخ ومكان الولادة</label>
              <input
                type="text"
                name="birthDateAndPlace"
                value={formData.birthDateAndPlace}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: دمشق 2010/05/14"
              />
            </div>

            {/* السكن الحالي */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">السكن الحالي</label>
              <input
                type="text"
                name="currentResidence"
                value={formData.currentResidence}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="المنطقة - الشارع - البناء"
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">رقم الهاتف</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="رقم الموبايل أو الأرضي"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            {/* مهنة الوالد */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">مهنة الوالد</label>
              <input
                type="text"
                name="fatherProfession"
                value={formData.fatherProfession}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مهنة الوالد الحالية"
              />
            </div>

            {/* تاريخ التسجيل */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">تاريخ التسجيل</label>
              <input
                type="date"
                name="registrationDate"
                value={formData.registrationDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
              />
            </div>

            {/* صورة شخصية */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-primary mb-2">صورة شخصية</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-soft-secondary/50 border-dashed rounded-lg hover:bg-background/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-text" />
                  <div className="flex text-sm text-neutral-text justify-center mt-4">
                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-accent hover:text-primary focus-within:outline-none">
                      <span>اختر صورة</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <p className="pr-1">أو اسحب وأفلت هنا</p>
                  </div>
                  <p className="text-xs text-neutral-text mt-2">
                    PNG, JPG, GIF حتى 2MB
                  </p>
                  {profilePicture && (
                    <p className="text-sm text-primary font-semibold mt-2">
                      تم اختيار: {profilePicture.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* هل الطالب يتيم */}
            <div className="md:col-span-2 flex items-center mt-2">
              <input
                id="isOrphan"
                name="isOrphan"
                type="checkbox"
                checked={formData.isOrphan}
                onChange={handleChange}
                className="h-5 w-5 rounded border-soft-secondary text-accent focus:ring-accent"
              />
              <label htmlFor="isOrphan" className="mr-3 text-sm font-semibold text-primary">
                هل الطالب يتيم؟
              </label>
            </div>

            {/* صورة دفتر العائلة */}
            <div className="md:col-span-2 mt-4">
              <label className="block text-sm font-semibold text-primary mb-2">صورة دفتر العائلة</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-soft-secondary/50 border-dashed rounded-lg hover:bg-background/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-text" />
                  <div className="flex text-sm text-neutral-text justify-center mt-4">
                    <label htmlFor="family-book-upload" className="relative cursor-pointer rounded-md font-medium text-accent hover:text-primary focus-within:outline-none">
                      <span>اختر صورة</span>
                      <input id="family-book-upload" name="family-book-upload" type="file" className="sr-only" accept="image/*" onChange={handleFamilyBookChange} />
                    </label>
                    <p className="pr-1">أو اسحب وأفلت هنا</p>
                  </div>
                  <p className="text-xs text-neutral-text mt-2">
                    PNG, JPG, GIF حتى 2MB
                  </p>
                  {familyBookPicture && (
                    <p className="text-sm text-primary font-semibold mt-2">
                      تم اختيار: {familyBookPicture.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-soft-secondary/30 mt-8">
            <button
              type="submit"
              className="px-8 py-3 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>حفظ البيانات</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 bg-soft-secondary hover:bg-[#c8b996] text-primary font-bold rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Card>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 left-8 bg-primary text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-accent" size={24} />
          <span className="font-semibold">تم إرسال البيانات بنجاح</span>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-8 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <AlertCircle className="text-white" size={24} />
          <span className="font-semibold">{error}</span>
        </div>
      )}
    </div>
  );
}
