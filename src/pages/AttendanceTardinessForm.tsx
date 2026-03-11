import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Clock, Calendar, Users, User, Filter, Search, Loader2, Edit2, Save, X, CalendarDays, BarChart3, UserCheck, UserX, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, addToOfflineQueue, fetchWithFallback } from '../utils/syncUtils';

type AttendanceRecord = {
  id: string;
  recordType: 'غياب' | 'تأخر' | 'إذن تأخر دائم';
  personType: 'طالب' | 'معلم';
  personName: string;
  groupName: string;
  date: string;
  duration: string;
  notes: string;
  teacherName: string;
};

const initialRecords: AttendanceRecord[] = [];

export default function AttendanceTardinessForm() {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [studentsList, setStudentsList] = useState<{name: string, group: string, teacher: string}[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [groupsList, setGroupsList] = useState<string[]>([]);
  const [teacherToGroup, setTeacherToGroup] = useState<Record<string, string>>({});
  
  const [currentUser, setCurrentUser] = useState({ name: 'Admin', role: 'Admin' });
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  
  const defaultDate = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    recordType: 'غياب' as 'غياب' | 'تأخر' | 'إذن تأخر دائم',
    personType: 'طالب' as 'طالب' | 'معلم',
    groupName: '',
    personName: '',
    date: defaultDate,
    duration: '',
    notes: '',
  });

  const [dateRange, setDateRange] = useState({
    from: defaultDate,
    to: defaultDate
  });

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ recordType: 'غياب', duration: '', notes: '' });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS);
        const cachedRecords = getCachedData(CACHE_KEYS.ATTENDANCE); // Assuming we cache attendance

        if (cachedStudents && cachedRecords) {
          processData(cachedStudents, cachedRecords);
        } else {
          setIsLoadingStudents(true);
          setIsLoadingRecords(true);
        }
      } else {
        setIsLoadingStudents(true);
        setIsLoadingRecords(true);
      }

      try {
        const data = await fetchWithFallback(API_URL);
        
        let rawStudents: any[] = [];
        if (data && Array.isArray(data['الطلاب'])) {
          rawStudents = data['الطلاب'];
        } else if (data && Array.isArray(data.students)) {
          rawStudents = data.students;
        } else if (Array.isArray(data)) {
          rawStudents = data;
        }

        let fetchedRecords: any[] = [];
        if (data && Array.isArray(data['الحضور_والغياب'])) {
          fetchedRecords = data['الحضور_والغياب'];
        } else if (data && Array.isArray(data.attendance)) {
          fetchedRecords = data.attendance;
        }

        setCachedData(CACHE_KEYS.STUDENTS, rawStudents);
        setCachedData(CACHE_KEYS.ATTENDANCE, fetchedRecords);

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
      const groupToTeacherMap: Record<string, string> = {};
      const teacherToGroupMap: Record<string, string> = {};
      const teachers = new Set<string>();
      const groups = new Set<string>();
      
      cachedGroups.forEach((g: any) => {
        const groupName = g[0] || g[1] || g['اسم الحلقة'];
        const teacherName = g[1] || g['اسم المعلم'];
        if (groupName && teacherName) {
          groupToTeacherMap[groupName] = teacherName;
          teacherToGroupMap[teacherName] = groupName;
          teachers.add(teacherName);
          groups.add(groupName);
        }
      });
      
      setTeachersList(Array.from(teachers));
      setGroupsList(Array.from(groups));
      setTeacherToGroup(teacherToGroupMap);

      let mappedStudents: {name: string, group: string, teacher: string}[] = [];
      if (rawStudents.length > 0) {
        mappedStudents = rawStudents.map((item: any) => {
          const name = typeof item === 'object' ? (item['الاسم الكامل'] || item['اسم الطالب'] || item.name || Object.values(item)[0]) : item;
          const group = typeof item === 'object' ? (item['اسم الحلقة'] || item['الحلقة'] || item[11]) : '';
          const teacher = groupToTeacherMap[group] || '';
          return { name, group, teacher };
        });
      }
      setStudentsList(mappedStudents);

      const mappedRecords: AttendanceRecord[] = fetchedRecords.map((r: any, index: number) => ({
        id: `a_${index}_${Date.now()}`,
        recordType: r['نوع السجل'] || r.recordType || r[0] || 'غياب',
        personType: r['فئة الشخص'] || r.personType || r[1] || 'طالب',
        groupName: r['اسم الحلقة'] || r.groupName || r[2] || '',
        personName: r['اسم الشخص'] || r.personName || r[3] || '',
        date: r['التاريخ'] || r.date || r[4] || '',
        duration: r['مدة التأخير'] || r.duration || r[5] || '',
        notes: r['ملاحظات'] || r.notes || r[6] || '',
        teacherName: groupToTeacherMap[r['اسم الحلقة'] || r.groupName || r[2] || ''] || 'المعلم'
      })).filter(r => r.personName);

      mappedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(mappedRecords);
    };

    fetchData();

    const handleForceRefresh = () => fetchData(true);
    window.addEventListener('force-refresh', handleForceRefresh);
    return () => window.removeEventListener('force-refresh', handleForceRefresh);
  }, []);

  // Effect to lock groupName for teachers
  useEffect(() => {
    if (currentUser.role !== 'Admin' && formData.personType === 'طالب') {
      const teacherGroup = teacherToGroup[currentUser.name] || '';
      setFormData(prev => ({ ...prev, groupName: teacherGroup }));
    }
  }, [currentUser, formData.personType, teacherToGroup]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset dependent fields
      if (name === 'personType') {
        newData.groupName = currentUser.role !== 'Admin' && value === 'طالب' ? (teacherToGroup[currentUser.name] || '') : '';
        newData.personName = '';
      }
      if (name === 'groupName') {
        newData.personName = '';
      }
      if (name === 'recordType' && value !== 'تأخر') {
        newData.duration = '';
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.clear();
    
    setError('');
    setSuccessMessage('');

    // Validation
    if (!formData.recordType || !formData.personType || !formData.personName || !formData.date) {
      setError('الرجاء تعبئة جميع الحقول الأساسية المطلوبة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (formData.personType === 'طالب' && !formData.groupName) {
      setError('الرجاء اختيار الحلقة للطالب');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (formData.recordType === 'تأخر' && !formData.duration) {
      setError('الرجاء تحديد مدة التأخير');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const googleSheetData = {
      baseName: "الحضور_والغياب",
      values: [
        formData.recordType,
        formData.personType,
        formData.groupName || "",
        formData.personName,
        formData.date,
        formData.duration || "",
        formData.notes
      ]
    };

    // Add to records
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      recordType: formData.recordType,
      personType: formData.personType,
      personName: formData.personName,
      groupName: formData.personType === 'طالب' ? formData.groupName : '',
      date: formData.date,
      duration: formData.recordType === 'تأخر' ? formData.duration : '',
      notes: formData.notes,
      teacherName: currentUser.role === 'Admin' ? 'Admin' : currentUser.name
    };

    setRecords([newRecord, ...records]);

    // Optimistic Reset
    setSuccessMessage('تم تسجيل الحضور/الغياب بنجاح');
    setFormData({
      recordType: 'غياب',
      personType: 'طالب',
      groupName: currentUser.role !== 'Admin' ? (teacherToGroup[currentUser.name] || '') : '',
      personName: '',
      date: new Date().toISOString().split('T')[0],
      duration: '',
      notes: '',
    });
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);

    // Background Execution
    if (!navigator.onLine) {
      addToOfflineQueue(googleSheetData);
    } else {
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(googleSheetData),
        mode: "no-cors"
      }).catch((err) => {
        console.error("Error submitting form in background:", err);
        addToOfflineQueue(googleSheetData);
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      recordType: 'غياب',
      personType: 'طالب',
      groupName: currentUser.role !== 'Admin' ? (teacherToGroup[currentUser.name] || '') : '',
      personName: '',
      date: defaultDate,
      duration: '',
      notes: '',
    });
    setError('');
    setSuccessMessage('');
  };

  const filteredPersons = formData.personType === 'طالب' 
    ? studentsList.filter(s => {
        const matchesName = s.name.toLowerCase().includes(formData.personName.toLowerCase());
        const matchesGroup = formData.groupName ? s.group === formData.groupName : true;
        const matchesTeacher = currentUser.role === 'Admin' || s.teacher === currentUser.name;
        return matchesName && matchesGroup && matchesTeacher;
      }).map(s => s.name)
    : teachersList.filter(t => t.toLowerCase().includes(formData.personName.toLowerCase()));

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
    let totalAbsences = 0;
    let totalLateness = 0;
    
    filteredRecords.forEach(r => {
      if (r.recordType === 'غياب') totalAbsences++;
      if (r.recordType === 'تأخر') totalLateness++;
    });

    // Total students in the group (or institute for Admin)
    const totalStudentsInGroup = studentsList.filter(s => 
      currentUser.role === 'Admin' || s.teacher === currentUser.name
    ).length;

    // Calculate Attendance %
    let diffDays = 1;
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const totalPossibleAttendances = totalStudentsInGroup * diffDays;
    const totalAbsencesCount = filteredRecords.filter(r => r.recordType === 'غياب' && r.personType === 'طالب').length;
    const presentAttendances = Math.max(0, totalPossibleAttendances - totalAbsencesCount);

    const attendancePercent = totalPossibleAttendances > 0 
      ? Math.round((presentAttendances / totalPossibleAttendances) * 100) 
      : 0;

    return {
      attendancePercent,
      totalAbsences,
      totalLateness
    };
  }, [filteredRecords, studentsList, currentUser]);

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      recordType: record.recordType,
      duration: record.duration || '',
      notes: record.notes || ''
    });
  };

  const handleSaveEdit = async (recordId: string) => {
    const updatedRecords = records.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          recordType: editFormData.recordType as any,
          duration: editFormData.recordType === 'تأخر' ? editFormData.duration : '',
          notes: editFormData.notes
        };
      }
      return r;
    });
    
    setRecords(updatedRecords);
    setEditingRecordId(null);
    
    const recordToUpdate = updatedRecords.find(r => r.id === recordId);
    if (!recordToUpdate) return;

    const payload = {
      type: 'UPDATE_ATTENDANCE',
      personName: recordToUpdate.personName,
      date: recordToUpdate.date,
      recordType: recordToUpdate.recordType,
      duration: recordToUpdate.duration,
      notes: recordToUpdate.notes
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
      type: 'DELETE_ATTENDANCE',
      personName: recordToDelete.personName,
      date: recordToDelete.date,
      recordType: recordToDelete.recordType
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
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent"
        >
          <option value="Admin">مدير النظام (Admin)</option>
          {teachersList.map(t => (
            <option key={t} value={t}>المعلم: {t}</option>
          ))}
        </select>
      </div>

      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4 flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Clock size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">الغياب والتأخر</h2>
            <p className="text-neutral-text mt-1">تسجيل ومتابعة حالات الغياب والتأخر للطلاب والمعلمين.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200 animate-in fade-in">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* نوع السجل */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">نوع السجل</label>
              <select
                name="recordType"
                value={formData.recordType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
              >
                <option value="غياب">تسجيل غياب</option>
                <option value="تأخر">تسجيل تأخر</option>
                <option value="إذن تأخر دائم">إذن تأخر دائم (للطلاب)</option>
              </select>
            </div>

            {/* صفة الشخص */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">صفة الشخص</label>
              <select
                name="personType"
                value={formData.personType}
                onChange={handleChange}
                disabled={formData.recordType === 'إذن تأخر دائم'}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none disabled:opacity-50"
              >
                <option value="طالب">طالب</option>
                <option value="معلم">معلم</option>
              </select>
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

            {/* الحلقة (للطلاب فقط) */}
            {formData.personType === 'طالب' && (
              <div>
                <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  الحلقة
                </label>
                <select
                  name="groupName"
                  value={formData.groupName}
                  onChange={handleChange}
                  disabled={currentUser.role !== 'Admin'}
                  className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none disabled:opacity-50 disabled:bg-gray-100"
                >
                  <option value="">اختر الحلقة...</option>
                  {groupsList.map((group, idx) => (
                    <option key={`${group}-${idx}`} value={group}>{group}</option>
                  ))}
                </select>
              </div>
            )}

            {/* الاسم (Autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <User size={16} className="text-accent" />
                الاسم
                {formData.personType === 'طالب' && isLoadingStudents && <Loader2 size={14} className="animate-spin text-accent ml-2" />}
              </label>
              <input
                type="text"
                name="personName"
                value={formData.personName}
                onChange={(e) => {
                  handleChange(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                disabled={formData.personType === 'طالب' && !formData.groupName}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 disabled:opacity-50 disabled:bg-gray-100"
                placeholder="اكتب الاسم..."
                autoComplete="off"
              />
              {showSuggestions && formData.personName && filteredPersons.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-soft-secondary/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPersons.map((person, idx) => (
                    <li
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        setFormData(prev => ({ ...prev, personName: person }));
                        setShowSuggestions(false);
                      }}
                      className="px-4 py-2 hover:bg-soft-secondary/20 cursor-pointer text-primary transition-colors"
                    >
                      {person}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* مدة التأخير (في حال التأخر فقط) */}
            {formData.recordType === 'تأخر' && (
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">مدة التأخير</label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50"
                  placeholder="مثال: 15 دقيقة"
                />
              </div>
            )}

            {/* ملاحظات */}
            <div className={`md:col-span-2 ${formData.recordType === 'تأخر' ? 'lg:col-span-3' : (formData.personType === 'معلم' ? 'lg:col-span-3' : 'lg:col-span-1')}`}>
              <label className="block text-sm font-semibold text-primary mb-2">ملاحظات / السبب (اختياري)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={1}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 resize-none"
                placeholder="أضف أي ملاحظات أو سبب..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t border-soft-secondary/30">
            <button
              type="submit"
              className="px-8 py-3 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={20} />
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
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">نسبة الحضور</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-2xl font-bold text-primary">{kpis.attendancePercent}%</p>
                  <div className="w-24 h-2 bg-soft-secondary/30 rounded-full mb-2 overflow-hidden">
                    <div 
                      className="h-full bg-accent rounded-full" 
                      style={{ width: `${kpis.attendancePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-background/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                <UserX size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">إجمالي الغياب</p>
                <p className="text-2xl font-bold text-primary mt-1">{kpis.totalAbsences}</p>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm border-none bg-gradient-to-br from-white to-background/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm text-neutral-text font-semibold">إجمالي التأخير</p>
                <p className="text-2xl font-bold text-primary mt-1">{kpis.totalLateness}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="shadow-lg border-none">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">سجل الحضور والغياب</h3>
            {isLoadingRecords && <Loader2 size={18} className="animate-spin text-accent" />}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-neutral-text bg-background/50 border-b border-soft-secondary/30">
                <tr>
                  <th className="px-4 py-4 font-semibold rounded-tr-lg">نوع السجل</th>
                  <th className="px-4 py-4 font-semibold">فئة الشخص</th>
                  <th className="px-4 py-4 font-semibold">اسم الحلقة</th>
                  <th className="px-4 py-4 font-semibold">اسم الشخص</th>
                  <th className="px-4 py-4 font-semibold">التاريخ</th>
                  <th className="px-4 py-4 font-semibold">مدة التأخير</th>
                  <th className="px-4 py-4 font-semibold">ملاحظات</th>
                  <th className="px-4 py-4 font-semibold rounded-tl-lg">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecords ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-neutral-text">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 size={24} className="animate-spin text-accent" />
                        <span>جاري تحميل البيانات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-soft-secondary/10 hover:bg-background/30 transition-colors">
                      {/* Editable Record Type */}
                      <td className="px-4 py-4">
                        {editingRecordId === record.id ? (
                          <select
                            value={editFormData.recordType}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, recordType: e.target.value }))}
                            className="px-2 py-1 text-sm border border-accent rounded outline-none"
                          >
                            <option value="غياب">غياب</option>
                            <option value="تأخر">تأخر</option>
                            <option value="إذن تأخر دائم">إذن تأخر دائم</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            record.recordType === 'غياب' ? 'bg-red-100 text-red-700' :
                            record.recordType === 'تأخر' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {record.recordType}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 text-neutral-text">{record.personType}</td>
                      <td className="px-4 py-4 text-neutral-text">{record.groupName || '-'}</td>
                      <td className="px-4 py-4 font-medium text-primary">{record.personName}</td>
                      <td className="px-4 py-4 text-neutral-text" dir="ltr" style={{ textAlign: 'right' }}>
                        {record.date ? new Date(record.date).toLocaleDateString('ar-SA') : '-'}
                      </td>
                      
                      {/* Editable Duration */}
                      <td className="px-4 py-4 text-neutral-text">
                        {editingRecordId === record.id && editFormData.recordType === 'تأخر' ? (
                          <input 
                            type="text"
                            value={editFormData.duration}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, duration: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm border border-accent rounded outline-none"
                            placeholder="المدة"
                          />
                        ) : (
                          record.duration || '-'
                        )}
                      </td>
                      
                      {/* Editable Notes */}
                      <td className="px-4 py-4 text-neutral-text">
                        {editingRecordId === record.id ? (
                          <input 
                            type="text"
                            value={editFormData.notes}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-32 px-2 py-1 text-sm border border-accent rounded outline-none"
                            placeholder="ملاحظات"
                          />
                        ) : (
                          <div className="max-w-[150px] truncate" title={record.notes}>{record.notes || '-'}</div>
                        )}
                      </td>
                      
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
                    <td colSpan={8} className="px-4 py-8 text-center text-neutral-text">
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
