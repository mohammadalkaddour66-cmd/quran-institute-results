import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Mic, BookOpen, User, Calendar, FileText, Award, Loader2, Edit2, Save, X, CalendarDays, Users, BarChart3, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, addToOfflineQueue, fetchWithFallback } from '../utils/syncUtils';

type RecitationRecord = {
  id: string;
  studentName: string;
  recitationType: string;
  pageOrSection: string;
  pageCount: string;
  result: string;
  score?: string;
  teacherName: string;
  notes: string;
  date: string;
};

const initialRecords: RecitationRecord[] = [];

export default function DailyRecitationForm() {
  const [records, setRecords] = useState<RecitationRecord[]>(initialRecords);
  const [studentsList, setStudentsList] = useState<{name: string, teacher: string}[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState({ name: 'Admin', role: 'Admin' });
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  
  const defaultDate = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    studentName: '',
    recitationType: '',
    pageOrSection: '',
    pageCount: '',
    result: '',
    score: '',
    notes: '',
    date: defaultDate,
  });

  const [dateRange, setDateRange] = useState({
    from: defaultDate,
    to: defaultDate
  });

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ pageCount: '', result: '' });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async (forceRefresh = false) => {
      // 1. Instant Loading (Cache)
      if (!forceRefresh) {
        const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS);
        const cachedRecords = getCachedData(CACHE_KEYS.RECORDS);

        if (cachedStudents && cachedRecords) {
          processData(cachedStudents, cachedRecords);
          // Don't set isLoading to true if we have cache
        } else {
          setIsLoadingStudents(true);
          setIsLoadingRecords(true);
        }
      } else {
        setIsLoadingStudents(true);
        setIsLoadingRecords(true);
      }

      // 2. Silent Background Sync
      try {
        const data = await fetchWithFallback(API_URL);
        
        // Extract students
        let rawStudents: any[] = [];
        if (data && Array.isArray(data['الطلاب'])) {
          rawStudents = data['الطلاب'];
        } else if (data && Array.isArray(data.students)) {
          rawStudents = data.students;
        } else if (Array.isArray(data)) {
          rawStudents = data;
        }

        // Extract recitation records
        let fetchedRecords: any[] = [];
        if (data && Array.isArray(data['السبر_اليومي'])) {
          fetchedRecords = data['السبر_اليومي'];
        } else if (data && Array.isArray(data.recitations)) {
          fetchedRecords = data.recitations;
        }

        // Update Cache
        setCachedData(CACHE_KEYS.STUDENTS, rawStudents);
        setCachedData(CACHE_KEYS.RECORDS, fetchedRecords);

        // Update UI
        processData(rawStudents, fetchedRecords);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingStudents(false);
        setIsLoadingRecords(false);
      }
    };

    const processData = (rawStudents: any[], fetchedRecords: any[]) => {
      const cachedGroups = getCachedData(CACHE_KEYS.GROUPS) || [];
      const groupToTeacher: Record<string, string> = {};
      const teachers = new Set<string>();
      
      cachedGroups.forEach((g: any) => {
        const groupName = g[0] || g[1] || g['اسم الحلقة'];
        const teacherName = g[1] || g['اسم المعلم'];
        if (groupName && teacherName) {
          groupToTeacher[groupName] = teacherName;
          teachers.add(teacherName);
        }
      });
      
      setTeachersList(Array.from(teachers));

      let mappedStudents: {name: string, teacher: string}[] = [];
      if (rawStudents.length > 0) {
        mappedStudents = rawStudents.map((item: any) => {
          const name = typeof item === 'object' ? (item['الاسم الكامل'] || item['اسم الطالب'] || item.name || Object.values(item)[0]) : item;
          const group = typeof item === 'object' ? (item['اسم الحلقة'] || item['الحلقة'] || item[11]) : '';
          const teacher = groupToTeacher[group] || '';
          return { name, teacher };
        });
      }
      setStudentsList(mappedStudents);

      const mappedRecords: RecitationRecord[] = fetchedRecords.map((r: any, index: number) => ({
        id: `r_${index}_${Date.now()}`,
        studentName: r['اسم الطالب'] || r.studentName || r[0] || '',
        recitationType: r['نوع التسميع'] || r.recitationType || r.testType || r[1] || '',
        pageOrSection: r['الصفحة / المقطع'] || r['الصفحة'] || r.pageOrSection || r.page || r[2] || '',
        pageCount: r['عدد الصفحات المسموعة'] || r.pageCount || r[3] || '',
        result: r['النتيجة'] || r.result || r[4] || '',
        score: r['الدرجة'] || r.score || r.grade || r[5] || '',
        date: r['التاريخ'] || r.date || r[6] || '',
        notes: r['ملاحظات'] || r.notes || r[7] || '',
        teacherName: r['اسم المعلم'] || r.teacherName || 'المعلم'
      })).filter(r => r.studentName); // Filter out empty rows

      // Sort by date descending (newest first)
      mappedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecords(mappedRecords);
    };

    fetchData();

    const handleForceRefresh = () => fetchData(true);
    window.addEventListener('force-refresh', handleForceRefresh);
    return () => window.removeEventListener('force-refresh', handleForceRefresh);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.clear();
    
    setError('');
    setSuccessMessage('');

    // Validation
    if (!formData.studentName || !formData.recitationType || !formData.pageOrSection || !formData.pageCount || !formData.result || !formData.date) {
      setError('الرجاء تعبئة جميع الحقول المطلوبة (الدرجة والملاحظات اختيارية)');
      setTimeout(() => setError(''), 4000);
      return;
    }

    const googleSheetData = {
      baseName: "السبر_اليومي",
      values: [
        formData.studentName,
        formData.recitationType,
        formData.pageOrSection,
        formData.pageCount,
        formData.result,
        formData.score,
        formData.date,
        formData.notes
      ]
    };

    // Add to local records for display
    const newRecord: RecitationRecord = {
      id: Date.now().toString(),
      studentName: formData.studentName,
      recitationType: formData.recitationType,
      pageOrSection: formData.pageOrSection,
      pageCount: formData.pageCount,
      result: formData.result,
      score: formData.score,
      teacherName: currentUser.name,
      notes: formData.notes,
      date: formData.date
    };

    setRecords([newRecord, ...records]);

    // Optimistic Reset
    setSuccessMessage('تم حفظ التسميع بنجاح');
    setFormData({
      studentName: '',
      recitationType: '',
      pageOrSection: '',
      pageCount: '',
      result: '',
      score: '',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
    
    setTimeout(() => {
      setSuccessMessage('');
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
      studentName: '',
      recitationType: '',
      pageOrSection: '',
      pageCount: '',
      result: '',
      score: '',
      notes: '',
      date: defaultDate,
    });
    setError('');
    setSuccessMessage('');
  };

  const filteredStudents = studentsList.filter(s => {
    const matchesName = s.name.toLowerCase().includes(formData.studentName.toLowerCase());
    const matchesTeacher = currentUser.role === 'Admin' || s.teacher === currentUser.name;
    return matchesName && matchesTeacher;
  });

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Role-based filtering
      if (currentUser.role !== 'Admin' && r.teacherName !== currentUser.name) {
        return false;
      }
      
      // Date filtering
      if (dateRange.from && r.date < dateRange.from) return false;
      if (dateRange.to && r.date > dateRange.to) return false;
      
      return true;
    });
  }, [records, dateRange, currentUser]);

  const kpis = useMemo(() => {
    let totalPages = 0;
    const uniqueStudents = new Set<string>();
    
    filteredRecords.forEach(r => {
      const pages = parseFloat(r.pageCount);
      if (!isNaN(pages)) {
        totalPages += pages;
      }
      uniqueStudents.add(r.studentName);
    });

    const studentsCount = uniqueStudents.size;
    
    // Total students in the group (or institute for Admin)
    const totalStudentsInGroup = studentsList.filter(s => 
      currentUser.role === 'Admin' || s.teacher === currentUser.name
    ).length;

    const completionPercent = totalStudentsInGroup > 0 
      ? Math.round((studentsCount / totalStudentsInGroup) * 100) 
      : 0;

    return {
      totalPages,
      studentsCount,
      completionPercent
    };
  }, [filteredRecords, studentsList, currentUser]);

  const handleEditClick = (record: RecitationRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      pageCount: record.pageCount,
      result: record.result
    });
  };

  const handleSaveEdit = async (recordId: string) => {
    // Update local state
    const updatedRecords = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          pageCount: editFormData.pageCount,
          result: editFormData.result
        };
      }
      return r;
    });
    
    setRecords(updatedRecords);
    setEditingRecordId(null);
    
    // Find the record to send to backend
    const recordToUpdate = updatedRecords.find(r => r.id === recordId);
    if (!recordToUpdate) return;

    const payload = {
      type: 'UPDATE_RECITATION',
      studentName: recordToUpdate.studentName,
      date: recordToUpdate.date,
      recitationType: recordToUpdate.recitationType,
      pageCount: recordToUpdate.pageCount,
      result: recordToUpdate.result
    };

    try {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      }).catch(err => console.error("Error updating record:", err));
    } catch (err) {
      console.error("Error updating record:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    
    const recordToDelete = records.find(r => r.id === recordId);
    if (!recordToDelete) return;

    // Optimistic update
    setRecords(records.filter(r => r.id !== recordId));
    
    // Show toast
    setSuccessMessage('تم حذف السجل بنجاح');
    setTimeout(() => setSuccessMessage(''), 3000);

    const payload = {
      type: 'DELETE_RECITATION',
      studentName: recordToDelete.studentName,
      date: recordToDelete.date,
      recitationType: recordToDelete.recitationType
    };

    try {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      }).catch(err => console.error("Error deleting record:", err));
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Mock User Selector for Demo Purposes */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
        <span className="text-sm font-bold text-gray-600">محاكاة تسجيل الدخول:</span>
        <select 
          value={currentUser.name}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'Admin') setCurrentUser({ name: 'Admin', role: 'Admin' });
            else setCurrentUser({ name: val, role: 'Teacher' });
          }}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-accent outline-none"
        >
          <option value="Admin">مدير النظام (Admin)</option>
          {teachersList.map((t, i) => (
            <option key={i} value={t}>المعلم: {t}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          (يظهر المعلم طلاب حلقته فقط، بينما يرى المدير جميع الطلاب)
        </span>
      </div>

      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4 flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Mic size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">التسميع اليومي</h2>
            <p className="text-neutral-text mt-1">تسجيل ومتابعة التسميع اليومي للطلاب في الحلقات.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* اسم الطالب (Autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <User size={16} className="text-accent" />
                اسم الطالب
                {isLoadingStudents && <Loader2 size={14} className="animate-spin text-accent ml-2" />}
              </label>
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={(e) => {
                  handleChange(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="اكتب اسم الطالب..."
                autoComplete="off"
              />
              {showSuggestions && formData.studentName && filteredStudents.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-soft-secondary/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredStudents.map((student, idx) => (
                    <li
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        setFormData(prev => ({ ...prev, studentName: student.name }));
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-soft-secondary/20 cursor-pointer text-primary transition-colors flex justify-between items-center"
                    >
                      <span>{student.name}</span>
                      {currentUser.role === 'Admin' && student.teacher && (
                        <span className="text-xs text-gray-400">({student.teacher})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* نوع التسميع (Free Text) */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                نوع التسميع
              </label>
              <input
                type="text"
                name="recitationType"
                value={formData.recitationType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: حفظ جديد، مراجعة..."
              />
            </div>

            {/* الصفحة/المقطع المسموع */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                الصفحة / المقطع المسموع
              </label>
              <input
                type="text"
                name="pageOrSection"
                value={formData.pageOrSection}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: سورة البقرة ص 12"
              />
            </div>

            {/* عدد الصفحات المسموعة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                عدد الصفحات المسموعة
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                name="pageCount"
                value={formData.pageCount}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="مثال: 0.5, 1.25, 2"
              />
            </div>

            {/* النتيجة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Award size={16} className="text-accent" />
                النتيجة
              </label>
              <select
                name="result"
                value={formData.result}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
              >
                <option value="">اختر النتيجة...</option>
                <option value="ممتاز">ممتاز</option>
                <option value="جيد جدًا">جيد جدًا</option>
                <option value="جيد">جيد</option>
                <option value="مقبول">مقبول</option>
                <option value="إعادة">إعادة</option>
              </select>
            </div>

            {/* الدرجة (اختياري) */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Award size={16} className="text-accent" />
                الدرجة (اختياري)
              </label>
              <input
                type="number"
                name="score"
                value={formData.score}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="0 - 100"
              />
            </div>

            {/* التاريخ */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                التاريخ
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
              />
            </div>

            {/* ملاحظات */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-semibold text-primary mb-2">ملاحظات (اختياري)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 resize-none"
                placeholder="أضف أي ملاحظات حول أداء الطالب..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-soft-secondary/30">
            <button
              type="submit"
              className="px-8 py-3 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>حفظ التسميع</span>
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

      {/* Smart Dashboard */}
      <div className="space-y-6">
        {/* Date Filter & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-soft-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-bold text-primary">لوحة المتابعة الذكية</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background/50 px-3 py-2 rounded-lg border border-soft-secondary/30">
              <CalendarDays size={18} className="text-accent" />
              <span className="text-sm font-semibold text-primary">من:</span>
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent text-sm outline-none text-neutral-text"
              />
            </div>
            <div className="flex items-center gap-2 bg-background/50 px-3 py-2 rounded-lg border border-soft-secondary/30">
              <CalendarDays size={18} className="text-accent" />
              <span className="text-sm font-semibold text-primary">إلى:</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent text-sm outline-none text-neutral-text"
              />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-background/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-xl text-accent">
                <BookOpen size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">إجمالي الصفحات</p>
                <p className="text-2xl font-bold text-primary mt-1">{kpis.totalPages}</p>
              </div>
            </div>
          </Card>
          
          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-background/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-xl text-accent">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">عدد الطلاب المسمّعين</p>
                <p className="text-2xl font-bold text-primary mt-1">{kpis.studentsCount}</p>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-background/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-xl text-accent">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">نسبة الإنجاز</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold text-primary">{kpis.completionPercent}%</p>
                  <div className="w-24 h-2 bg-soft-secondary/30 rounded-full mb-2 overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full" 
                      style={{ width: `${kpis.completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="shadow-lg border-none">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">سجل التسميع</h3>
            {isLoadingRecords && <Loader2 size={18} className="animate-spin text-accent" />}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-neutral-text bg-background/50 border-b border-soft-secondary/30">
                <tr>
                  <th className="px-4 py-4 font-semibold rounded-tr-lg">التاريخ</th>
                  <th className="px-4 py-4 font-semibold">اسم الطالب</th>
                  <th className="px-4 py-4 font-semibold">نوع التسميع</th>
                  <th className="px-4 py-4 font-semibold">المقطع</th>
                  <th className="px-4 py-4 font-semibold">عدد الصفحات</th>
                  <th className="px-4 py-4 font-semibold">النتيجة</th>
                  <th className="px-4 py-4 font-semibold">الدرجة</th>
                  <th className="px-4 py-4 font-semibold">ملاحظات</th>
                  <th className="px-4 py-4 font-semibold">المعلم</th>
                  <th className="px-4 py-4 font-semibold rounded-tl-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecords ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-neutral-text">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-accent" />
                        <span>جاري تحميل البيانات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-soft-secondary/10 hover:bg-background/30 transition-colors">
                      <td className="px-4 py-4 text-neutral-text" dir="ltr" style={{ textAlign: 'right' }}>
                        {record.date ? new Date(record.date).toLocaleDateString('ar-SA') : '-'}
                      </td>
                      <td className="px-4 py-4 font-medium text-primary">{record.studentName}</td>
                      <td className="px-4 py-4 text-neutral-text">
                        <span className="px-2.5 py-1 bg-soft-secondary/20 text-primary rounded-full text-xs font-semibold">
                          {record.recitationType}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-text">{record.pageOrSection}</td>
                      
                      {/* Editable Page Count */}
                      <td className="px-4 py-4 text-neutral-text">
                        {editingRecordId === record.id ? (
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            value={editFormData.pageCount}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, pageCount: e.target.value }))}
                            className="w-16 px-2 py-1 text-sm border border-accent rounded outline-none"
                          />
                        ) : (
                          record.pageCount || '-'
                        )}
                      </td>
                      
                      {/* Editable Result */}
                      <td className="px-4 py-4 text-primary font-semibold">
                        {editingRecordId === record.id ? (
                          <select
                            value={editFormData.result}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, result: e.target.value }))}
                            className="px-2 py-1 text-sm border border-accent rounded outline-none"
                          >
                            <option value="ممتاز">ممتاز</option>
                            <option value="جيد جدًا">جيد جدًا</option>
                            <option value="جيد">جيد</option>
                            <option value="مقبول">مقبول</option>
                            <option value="إعادة">إعادة</option>
                          </select>
                        ) : (
                          record.result
                        )}
                      </td>
                      
                      <td className="px-4 py-4 text-neutral-text">{record.score || '-'}</td>
                      <td className="px-4 py-4 text-neutral-text max-w-[150px] truncate" title={record.notes}>{record.notes || '-'}</td>
                      <td className="px-4 py-4 text-neutral-text">{record.teacherName}</td>
                      
                      {/* Actions */}
                      <td className="px-4 py-4">
                        {editingRecordId === record.id ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleSaveEdit(record.id)}
                              className="p-1.5 bg-accent/10 text-accent rounded hover:bg-accent hover:text-white transition-colors"
                              title="حفظ"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                              title="إلغاء"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditClick(record)}
                              className="p-1.5 text-neutral-text hover:text-accent transition-colors"
                              title="تعديل"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1.5 text-neutral-text hover:text-red-500 transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-neutral-text">
                      لا توجد بيانات (No data found)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-8 left-8 bg-primary text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-accent" size={24} />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}
    </div>
  );
}

