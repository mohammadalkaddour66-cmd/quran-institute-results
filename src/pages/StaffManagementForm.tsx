import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import Card from '../components/Card';
import { API_URL, addToOfflineQueue } from '../utils/syncUtils';

export default function StaffManagementForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    nationalId: '',
    birthDateAndPlace: '',
    educationalStatus: '',
    phoneNumber: '',
    gender: '',
    residence: '',
    startDate: new Date().toISOString().split('T')[0],
    jobTitle: '',
  });

  const [profilePicture, setProfilePicture] = useState<{name: string, base64: string} | null>(null);
  const [educationalQualificationPicture, setEducationalQualificationPicture] = useState<{name: string, base64: string} | null>(null);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleEducationalQualificationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImage(file);
        setEducationalQualificationPicture({ name: file.name, base64 });
      } catch (error) {
        console.error("Error compressing image:", error);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.clear();
    
    setError('');
    setShowSuccess(false);

    const requiredFields = [
      'fullName', 'fatherName', 'motherName', 'nationalId',
      'birthDateAndPlace', 'educationalStatus', 'phoneNumber',
      'gender', 'residence', 'startDate', 'jobTitle'
    ];

    const isAnyFieldEmpty = requiredFields.some(field => !formData[field as keyof typeof formData]);
    
    if (isAnyFieldEmpty) {
      setError('الرجاء تعبئة جميع الحقول المطلوبة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    let profilePhotoBase64 = profilePicture ? profilePicture.base64 : "";
    let eduQualPhotoBase64 = educationalQualificationPicture ? educationalQualificationPicture.base64 : "";

    const googleSheetData = {
      baseName: "إدارة_الكادر",
      timestamp: new Date().getTime(),
      values: [
        formData.fullName,
        formData.fatherName,
        formData.motherName,
        formData.nationalId,
        formData.birthDateAndPlace,
        formData.educationalStatus,
        formData.phoneNumber,
        formData.gender,
        formData.residence,
        formData.startDate,
        formData.jobTitle,
        profilePhotoBase64,
        eduQualPhotoBase64
      ]
    };

    // Optimistic Reset
    setShowSuccess(true);
    setFormData({
      fullName: '',
      fatherName: '',
      motherName: '',
      nationalId: '',
      birthDateAndPlace: '',
      educationalStatus: '',
      phoneNumber: '',
      gender: '',
      residence: '',
      startDate: new Date().toISOString().split('T')[0],
      jobTitle: '',
    });
    setProfilePicture(null);
    setEducationalQualificationPicture(null);
    
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
      nationalId: '',
      birthDateAndPlace: '',
      educationalStatus: '',
      phoneNumber: '',
      gender: '',
      residence: '',
      startDate: new Date().toISOString().split('T')[0],
      jobTitle: '',
    });
    setProfilePicture(null);
    setEducationalQualificationPicture(null);
    setError('');
    setShowSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4">
          <h2 className="text-2xl font-bold text-primary">تسجيل الكادر - إضافة موظف جديد</h2>
          <p className="text-neutral-text mt-2">يرجى إدخال بيانات الموظف بدقة في الحقول المخصصة.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

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

            {/* الرقم الوطني */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">الرقم الوطني</label>
              <input
                type="text"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="الرقم الوطني المكون من 11 خانة"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            {/* تاريخ ومكان الميلاد */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">تاريخ ومكان الميلاد</label>
              <input
                type="text"
                name="birthDateAndPlace"
                value={formData.birthDateAndPlace}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: دمشق 1990/01/01"
              />
            </div>

            {/* الحالة الدراسية */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">الحالة الدراسية</label>
              <input
                type="text"
                name="educationalStatus"
                value={formData.educationalStatus}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="المؤهل العلمي (إجازة، دبلوم، الخ)"
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

            {/* الجنس */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">الجنس</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
              >
                <option value="">اختر الجنس</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            {/* المحافظة والسكن */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">المحافظة والسكن</label>
              <input
                type="text"
                name="residence"
                value={formData.residence}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="المحافظة - المنطقة - العنوان التفصيلي"
              />
            </div>

            {/* تاريخ المباشرة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">تاريخ المباشرة</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
              />
            </div>

            {/* صفة الوظيفة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">صفة الوظيفة</label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: مدرس، إداري، مشرف"
              />
            </div>

            {/* صورة شخصية */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-primary mb-2">صورة شخصية (اختياري)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-soft-secondary/50 border-dashed rounded-lg hover:bg-background/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-text" />
                  <div className="flex text-sm text-neutral-text justify-center mt-4">
                    <label htmlFor="staff-file-upload" className="relative cursor-pointer rounded-md font-medium text-accent hover:text-primary focus-within:outline-none">
                      <span>اختر صورة</span>
                      <input id="staff-file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
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

            {/* صورة المؤهل العلمي */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-primary mb-2">صورة المؤهل العلمي</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-soft-secondary/50 border-dashed rounded-lg hover:bg-background/50 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-neutral-text" />
                  <div className="flex text-sm text-neutral-text justify-center mt-4">
                    <label htmlFor="edu-qual-upload" className="relative cursor-pointer rounded-md font-medium text-accent hover:text-primary focus-within:outline-none">
                      <span>اختر صورة</span>
                      <input id="edu-qual-upload" name="edu-qual-upload" type="file" className="sr-only" accept="image/*" onChange={handleEducationalQualificationChange} />
                    </label>
                    <p className="pr-1">أو اسحب وأفلت هنا</p>
                  </div>
                  <p className="text-xs text-neutral-text mt-2">
                    PNG, JPG, GIF حتى 2MB
                  </p>
                  {educationalQualificationPicture && (
                    <p className="text-sm text-primary font-semibold mt-2">
                      تم اختيار: {educationalQualificationPicture.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-soft-secondary/30 mt-8">
            <button
              type="submit"
              className="px-8 py-3 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors"
            >
              حفظ البيانات
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
          <span className="font-semibold">تم حفظ بيانات الكادر بنجاح!</span>
        </div>
      )}
    </div>
  );
}
