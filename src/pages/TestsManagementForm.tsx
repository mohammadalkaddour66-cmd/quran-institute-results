import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, FileText, Calendar, Users, User, Filter, Search, Award, BookOpen, Loader2 } from 'lucide-react';
import Card from '../components/Card';
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, addToOfflineQueue, fetchWithFallback } from '../utils/syncUtils';

type TestRecord = {
  id: string;
  studentName: string;
  groupName: string;
  testType: string;
  result: string;
  date: string;
  notes?: string;
};

const initialRecords: TestRecord[] = [];

const groupsList = ['حلقة أبو بكر', 'حلقة عمر', 'حلقة خديجة'];

const testTypes = [
  'اختبار سبر',
  'اختبار نصف جزء',
  'اختبار جزء كامل',
  'اختبار 3 أجزاء',
  'اختبار 5 أجزاء',
  'اختبار نهاية مستوى',
  'اختبار حفظ',
  'اختبار مراجعة',
  'اختبار سورة البقرة',
  'اختبار جزء عم',
  'اختبار تثبيت'
];

export default function TestsManagementForm() {
  const [records, setRecords] = useState<TestRecord[]>(initialRecords);
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  
  const defaultDate = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    groupName: '',
    studentName: '',
    testType: '',
    result: '',
    date: defaultDate,
    notes: '',
  });

  const [filterDate, setFilterDate] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTestTypeSuggestions, setShowTestTypeSuggestions] = useState(false);

  useEffect(() => {
    const fetchStudents = async (forceRefresh = false) => {
      // 1. Instant Loading (Cache)
      if (!forceRefresh) {
        const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS);
        if (cachedStudents && Array.isArray(cachedStudents)) {
          const mapped = cachedStudents.map((item: any) => typeof item === 'object' ? (item['الاسم الكامل'] || item['اسم الطالب'] || item.name || Object.values(item)[0]) : item);
          setStudentsList(mapped);
        } else {
          setIsLoadingStudents(true);
        }
      } else {
        setIsLoadingStudents(true);
      }

      // 2. Silent Background Sync
      try {
        const data = await fetchWithFallback(API_URL);
        
        let rawStudents: any[] = [];
        let mappedStudents: string[] = [];
        
        if (Array.isArray(data)) {
          rawStudents = data;
          if (data.length > 0 && typeof data[0] === 'object') {
             mappedStudents = data.map(item => item.name || item.studentName || item['اسم الطالب'] || Object.values(item)[0] as string);
          } else {
             mappedStudents = data;
          }
        } else if (data && Array.isArray(data.students)) {
          rawStudents = data.students;
          mappedStudents = data.students.map((item: any) => typeof item === 'object' ? (item.name || item.studentName || item['اسم الطالب'] || Object.values(item)[0]) : item);
        } else if (data && Array.isArray(data.data)) {
          rawStudents = data.data;
          mappedStudents = data.data.map((item: any) => typeof item === 'object' ? (item.name || item.studentName || item['اسم الطالب'] || Object.values(item)[0]) : item);
        } else if (data && Array.isArray(data['الطلاب'])) {
          rawStudents = data['الطلاب'];
          mappedStudents = data['الطلاب'].map((item: any) => typeof item === 'object' ? (item['الاسم الكامل'] || item['اسم الطالب'] || item.name || Object.values(item)[0]) : item);
        }

        setCachedData(CACHE_KEYS.STUDENTS, rawStudents);
        setStudentsList(mappedStudents);

      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();

    const handleForceRefresh = () => fetchStudents(true);
    window.addEventListener('force-refresh', handleForceRefresh);
    return () => window.removeEventListener('force-refresh', handleForceRefresh);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset student if group changes
      if (name === 'groupName') {
        newData.studentName = '';
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.clear();
    
    setError('');
    setShowSuccess(false);

    // Validation
    if (!formData.groupName || !formData.studentName || !formData.testType || !formData.result || !formData.date) {
      setError('الرجاء تعبئة جميع الحقول الأساسية المطلوبة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const googleSheetData = {
      baseName: "الاختبارات",
      values: [
        formData.groupName,
        formData.studentName,
        formData.testType,
        formData.result,
        formData.date,
        formData.notes
      ]
    };

    // Add to records
    const newRecord: TestRecord = {
      id: Date.now().toString(),
      groupName: formData.groupName,
      studentName: formData.studentName,
      testType: formData.testType,
      result: formData.result,
      date: formData.date,
      notes: formData.notes,
    };

    setRecords([newRecord, ...records]);

    // Optimistic Reset
    setShowSuccess(true);
    setFormData({
      groupName: '',
      studentName: '',
      testType: '',
      result: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    
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
      groupName: '',
      studentName: '',
      testType: '',
      result: '',
      date: defaultDate,
      notes: '',
    });
    setError('');
    setShowSuccess(false);
  };

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchDate = filterDate ? record.date === filterDate : true;
    const matchGroup = filterGroup ? record.groupName === filterGroup : true;
    return matchDate && matchGroup;
  });

  const filteredTestTypes = testTypes.filter(t => 
    t.toLowerCase().includes(formData.testType.toLowerCase())
  );

  const filteredStudents = studentsList.filter(s => 
    typeof s === 'string' && s.toLowerCase().includes(formData.studentName.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4 flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">إدارة الاختبارات</h2>
            <p className="text-neutral-text mt-1">تسجيل ومتابعة نتائج اختبارات الطلاب في الحلقات.</p>
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
            
            {/* الحلقة */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                الحلقة
              </label>
              <select
                name="groupName"
                value={formData.groupName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
              >
                <option value="">اختر الحلقة...</option>
                {groupsList.map((group, idx) => (
                  <option key={`${group}-${idx}`} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* الطالب (Autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <User size={16} className="text-accent" />
                الطالب
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
                disabled={!formData.groupName}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 disabled:opacity-50"
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
                        setFormData(prev => ({ ...prev, studentName: student }));
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-soft-secondary/20 cursor-pointer text-primary transition-colors"
                    >
                      {student}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* نوع الاختبار */}
            <div className="relative">
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                نوع الاختبار
              </label>
              <input
                type="text"
                name="testType"
                value={formData.testType}
                onChange={(e) => {
                  handleChange(e);
                  setShowTestTypeSuggestions(true);
                }}
                onFocus={() => setShowTestTypeSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTestTypeSuggestions(false), 200)}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="اكتب نوع الاختبار..."
                autoComplete="off"
              />
              {showTestTypeSuggestions && formData.testType && filteredTestTypes.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-soft-secondary/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTestTypes.map((type, idx) => (
                    <li
                      key={`${type}-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        setFormData(prev => ({ ...prev, testType: type }));
                        setShowTestTypeSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-soft-secondary/20 cursor-pointer text-primary transition-colors"
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* نتيجة الاختبار */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Award size={16} className="text-accent" />
                نتيجة الاختبار
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

            {/* التاريخ */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-accent" />
                تاريخ الاختبار
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
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-primary mb-2">ملاحظات (اختياري)</label>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                placeholder="أضف أي ملاحظات..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-soft-secondary/30">
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

      {/* سجل الاختبارات */}
      <Card className="shadow-lg border-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-primary">سجل الاختبارات</h3>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent text-sm bg-background/50"
              />
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-text" size={16} />
            </div>
            <div className="relative flex-1 md:w-48">
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent text-sm bg-background/50 appearance-none"
              >
                <option value="">كل الحلقات</option>
                {groupsList.map((group, idx) => (
                  <option key={`${group}-${idx}`} value={group}>{group}</option>
                ))}
              </select>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-text" size={16} />
            </div>
            {(filterDate || filterGroup) && (
              <button 
                onClick={() => { setFilterDate(''); setFilterGroup(''); }}
                className="text-sm text-accent hover:text-primary transition-colors"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="text-xs text-neutral-text bg-background/50 border-b border-soft-secondary/30">
              <tr>
                <th className="px-4 py-4 font-semibold rounded-tr-lg">الطالب</th>
                <th className="px-4 py-4 font-semibold">الحلقة</th>
                <th className="px-4 py-4 font-semibold">نوع الاختبار</th>
                <th className="px-4 py-4 font-semibold">النتيجة</th>
                <th className="px-4 py-4 font-semibold">التاريخ</th>
                <th className="px-4 py-4 font-semibold rounded-tl-lg">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-soft-secondary/10 hover:bg-background/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-primary">{record.studentName}</td>
                    <td className="px-4 py-4 text-neutral-text">{record.groupName}</td>
                    <td className="px-4 py-4 text-primary font-medium">{record.testType}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        record.result === 'ممتاز' ? 'bg-green-100 text-green-700' :
                        record.result === 'جيد جدًا' ? 'bg-blue-100 text-blue-700' :
                        record.result === 'جيد' ? 'bg-yellow-100 text-yellow-700' :
                        record.result === 'مقبول' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.result}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-neutral-text" dir="ltr" style={{ textAlign: 'right' }}>{record.date}</td>
                    <td className="px-4 py-4 text-neutral-text">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-text">
                    لا يوجد سجلات مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 left-8 bg-primary text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-accent" size={24} />
          <span className="font-semibold">تم الحفظ بنجاح</span>
        </div>
      )}
    </div>
  );
}
