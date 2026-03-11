import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Search, CheckCircle2, Users, BookOpen, UserCog, ArrowLeftRight, X, Loader2, Edit } from 'lucide-react';
import Card from '../components/Card';
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, addToOfflineQueue, fetchWithFallback } from '../utils/syncUtils';

type Student = {
  id: string;
  name: string;
  isOrphan?: boolean;
};

type TeacherRole = {
  name: string;
  role: string;
};

type Halaqa = {
  id: string;
  name: string;
  teachers: TeacherRole[];
  students: Student[];
  notes?: string;
};

export default function ClassesGroupsManagementForm() {
  const [halaqat, setHalaqat] = useState<Halaqa[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Halaqa | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Halaqa | null>(null);
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false);
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Halaqa | null>(null);
  const [newGroupData, setNewGroupData] = useState({
    groupName: '',
    teacherName: '',
    secondaryTeacher: '',
    notes: ''
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  
  // Loading states for individual actions
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Transfer State
  const [transferState, setTransferState] = useState<{ studentId: string, halaqaId: string } | null>(null);

  const fetchData = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cachedGroups = getCachedData(CACHE_KEYS.GROUPS);
      const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS);
      const cachedStaff = getCachedData(CACHE_KEYS.STAFF);

      if (cachedGroups && cachedStudents && cachedStaff) {
        processData(cachedGroups, cachedStudents, cachedStaff);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }

    try {
      const d = new Date();
      const suffix = `_${d.getMonth() + 1}_${d.getFullYear()}`;
      const data = await fetchWithFallback(`${API_URL}?action=getFullData&suffix=${suffix}`);
      
      let fetchedGroups: any[] = [];
      let fetchedStudents: any[] = [];
      let fetchedTeachers: string[] = [];

      if (data) {
        if (Array.isArray(data.groups)) fetchedGroups = data.groups;
        if (Array.isArray(data.students)) fetchedStudents = data.students;
        if (Array.isArray(data.staff)) {
          fetchedTeachers = data.staff.map((item: any) => typeof item === 'object' ? (item.name || item['الاسم'] || Object.values(item)[0]) : item);
        }
      }

      setCachedData(CACHE_KEYS.GROUPS, fetchedGroups);
      setCachedData(CACHE_KEYS.STUDENTS, fetchedStudents);
      setCachedData(CACHE_KEYS.STAFF, fetchedTeachers);

      processData(fetchedGroups, fetchedStudents, fetchedTeachers);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processData = (fetchedGroups: any[], fetchedStudents: any[], fetchedTeachers: string[]) => {
    setTeachersList(fetchedTeachers);

    const groupCounts: Record<string, number> = {};
    const mappedHalaqat: Halaqa[] = fetchedGroups.map((g: any, index: number) => {
      const groupName = g[0] || g[1] || g['اسم الحلقة'] || `حلقة ${index + 1}`;
      const teacherName = g[1] || g['اسم المعلم'] || '';
      const notes = g[3] || g['ملاحظات'] || '';
      
      const groupStudents = fetchedStudents.filter((s: any) => {
         const sGroup = s[11] || s['اسم الحلقة'] || s['الحلقة'];
         return sGroup === groupName;
      }).map((s: any, sIdx: number) => ({
         id: `s_${s[0]}_${sIdx}`,
         name: s[0] || s['الاسم الكامل'] || s['اسم الطالب'],
         isOrphan: s[10] === 'نعم' || s['يتيم'] === 'نعم'
      }));

      groupCounts[groupName] = groupStudents.length;

      return {
        id: `h_${index}_${Date.now()}`,
        name: groupName,
        teachers: teacherName ? [{ name: teacherName, role: 'معلم رئيسي' }] : [],
        students: groupStudents,
        notes
      };
    }).filter(h => h.name);

    const unassigned = fetchedStudents.filter((s: any) => {
         const sGroup = s[11] || s['اسم الحلقة'] || s['الحلقة'];
         return !sGroup || (!mappedHalaqat.some(h => h.name === sGroup) && sGroup !== 'غير محدد');
    }).map((s: any, sIdx: number) => ({
         id: `s_unassigned_${s[0]}_${sIdx}`,
         name: s[0] || s['الاسم الكامل'] || s['اسم الطالب'],
         isOrphan: s[10] === 'نعم' || s['يتيم'] === 'نعم'
    })).filter(s => s.name);

    setUnassignedStudents(unassigned);
    setHalaqat(mappedHalaqat);
  };

  useEffect(() => {
    fetchData();
    const handleForceRefresh = () => fetchData(true);
    window.addEventListener('force-refresh', handleForceRefresh);
    return () => window.removeEventListener('force-refresh', handleForceRefresh);
  }, []);

  const handleOpenAddModal = () => {
    setEditingGroup(null);
    setNewGroupData({ groupName: '', teacherName: '', secondaryTeacher: '', notes: '' });
    setSelectedStudents([]);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (halaqa: Halaqa) => {
    setEditingGroup(halaqa);
    setNewGroupData({
      groupName: halaqa.name,
      teacherName: halaqa.teachers.find(t => t.role === 'معلم رئيسي')?.name || '',
      secondaryTeacher: halaqa.teachers.find(t => t.role === 'معلم مساعد')?.name || '',
      notes: halaqa.notes || ''
    });
    setSelectedStudents([]);
    setIsAddModalOpen(true);
  };

  const confirmDeleteGroup = (halaqa: Halaqa) => {
    setGroupToDelete(halaqa);
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    const halaqa = groupToDelete;
    setGroupToDelete(null);

    // Save previous state for rollback
    const previousHalaqat = [...halaqat];
    const previousUnassigned = [...unassignedStudents];
    const previousCachedStudents = getCachedData(CACHE_KEYS.STUDENTS) || [];
    const previousCachedGroups = getCachedData(CACHE_KEYS.GROUPS) || [];

    // Optimistic Update
    setHalaqat(halaqat.filter(h => h.id !== halaqa.id));
    setUnassignedStudents([...unassignedStudents, ...halaqa.students]);
    
    // Update cache
    let cachedStudents = [...previousCachedStudents];
    cachedStudents = cachedStudents.map((s: any) => {
      const sName = s[0] || s['الاسم الكامل'] || s['اسم الطالب'];
      if (halaqa.students.some(st => st.name === sName)) {
        const newS = [...s];
        newS[11] = ''; // Remove group name
        return newS;
      }
      return s;
    });
    setCachedData(CACHE_KEYS.STUDENTS, cachedStudents);

    let cachedGroups = [...previousCachedGroups];
    cachedGroups = cachedGroups.filter((g: any) => {
      const groupName = g[0] || g[1] || g['اسم الحلقة'];
      return groupName !== halaqa.name;
    });
    setCachedData(CACHE_KEYS.GROUPS, cachedGroups);
    updateDashboardCache(cachedStudents, cachedGroups);

    const payload = {
      type: 'DELETE_GROUP',
      groupName: halaqa.name
    };

    try {
      console.log('Sending data to:', API_URL);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Error deleting group:", err);
      // Rollback
      setHalaqat(previousHalaqat);
      setUnassignedStudents(previousUnassigned);
      setCachedData(CACHE_KEYS.STUDENTS, previousCachedStudents);
      setCachedData(CACHE_KEYS.GROUPS, previousCachedGroups);
      updateDashboardCache(previousCachedStudents, previousCachedGroups);
      
      alert('فشل الاتصال، يرجى المحاولة مرة أخرى.');
      addToOfflineQueue(payload);
    }
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setEditingGroup(null);
  };

  const handleOpenAddStudentsModal = (halaqa: Halaqa) => {
    setSelectedGroupForStudents(halaqa);
    setSelectedStudents([]);
    setIsAddStudentsModalOpen(true);
  };

  const handleCloseAddStudentsModal = () => {
    setIsAddStudentsModalOpen(false);
    setSelectedGroupForStudents(null);
  };

  const updateDashboardCache = (updatedStudents: any[], updatedGroups: any[]) => {
    const dashboardRaw = getCachedData('dashboard_raw');
    if (dashboardRaw) {
       if (dashboardRaw.students) dashboardRaw.students = updatedStudents;
       if (dashboardRaw.groups) dashboardRaw.groups = updatedGroups;
       setCachedData('dashboard_raw', dashboardRaw);
    }
  };

  const handleSaveGroup = async () => {
    if (!newGroupData.groupName.trim()) {
      alert('يرجى إدخال اسم الحلقة');
      return;
    }

    const isEditing = !!editingGroup;
    setLoadingAction(isEditing ? 'edit_group' : 'add_group');

    const d = new Date();
    const dateStr = d.toISOString().split('T')[0];

    let updatedHalaqat;
    let newHalaqa: Halaqa;

    if (isEditing) {
      newHalaqa = {
        ...editingGroup,
        name: newGroupData.groupName,
        teachers: [
          ...(newGroupData.teacherName ? [{ name: newGroupData.teacherName, role: 'معلم رئيسي' }] : []),
          ...(newGroupData.secondaryTeacher ? [{ name: newGroupData.secondaryTeacher, role: 'معلم مساعد' }] : [])
        ],
        notes: newGroupData.notes
      };
      updatedHalaqat = halaqat.map(h => h.id === editingGroup.id ? newHalaqa : h);
    } else {
      newHalaqa = {
        id: `h${Date.now()}`,
        name: newGroupData.groupName,
        teachers: [
          ...(newGroupData.teacherName ? [{ name: newGroupData.teacherName, role: 'معلم رئيسي' }] : []),
          ...(newGroupData.secondaryTeacher ? [{ name: newGroupData.secondaryTeacher, role: 'معلم مساعد' }] : [])
        ],
        students: unassignedStudents.filter(s => selectedStudents.includes(s.id)),
        notes: newGroupData.notes
      };
      updatedHalaqat = [...halaqat, newHalaqa];
      // Remove selected students from unassigned
      setUnassignedStudents(unassignedStudents.filter(s => !selectedStudents.includes(s.id)));
    }

    // Update local state immediately
    setHalaqat(updatedHalaqat);
    
    // Update students in cache if adding new group with students
    let updatedStudents = getCachedData(CACHE_KEYS.STUDENTS) || [];
    if (!isEditing && newHalaqa.students.length > 0) {
      updatedStudents = updatedStudents.map((s: any) => {
        const sName = s[0] || s['الاسم الكامل'] || s['اسم الطالب'];
        if (newHalaqa.students.some(st => st.name === sName)) {
          const newS = [...s];
          newS[11] = newGroupData.groupName; // Index 11 is group name
          return newS;
        }
        return s;
      });
      setCachedData(CACHE_KEYS.STUDENTS, updatedStudents);
    }

    // Update groups in cache
    let cachedGroups = getCachedData(CACHE_KEYS.GROUPS) || [];
    if (isEditing) {
      cachedGroups = cachedGroups.map((g: any) => {
        const groupName = g[0] || g[1] || g['اسم الحلقة'];
        if (groupName === editingGroup.name) {
          return [newGroupData.groupName, newGroupData.teacherName, dateStr, newGroupData.notes];
        }
        return g;
      });
    } else {
      const newGroupRow = [newGroupData.groupName, newGroupData.teacherName, dateStr, newGroupData.notes];
      cachedGroups.push(newGroupRow);
    }
    setCachedData(CACHE_KEYS.GROUPS, cachedGroups);

    updateDashboardCache(updatedStudents, cachedGroups);

    // Send to Google Sheets
    const payload = isEditing ? {
      type: 'EDIT_GROUP',
      oldName: editingGroup.name,
      newName: newGroupData.groupName,
      values: [
        newGroupData.groupName,
        newGroupData.teacherName,
        newGroupData.secondaryTeacher,
        dateStr,
        newGroupData.notes
      ]
    } : {
      type: 'ADD_GROUP',
      baseName: 'إدارة_الحلقات',
      values: [
        newGroupData.groupName,
        newGroupData.teacherName,
        newGroupData.secondaryTeacher,
        dateStr,
        newGroupData.notes
      ]
    };

    try {
      console.log('Sending data to:', API_URL);
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      });
      
      // If there are students selected (only on add), update their groups as well
      if (!isEditing) {
        for (const student of newHalaqa.students) {
          const studentPayload = {
            type: "UPDATE_STUDENT_GROUP",
            studentName: student.name,
            groupName: newGroupData.groupName
          };
          console.log('Sending data to:', API_URL);
          await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(studentPayload),
            mode: "no-cors"
          });
        }
      }
    } catch (err) {
      console.error("Error submitting group:", err);
      addToOfflineQueue(payload);
      window.dispatchEvent(new CustomEvent('offline-save', { 
        detail: { message: 'فشل الاتصال بالخادم، سيتم المحاولة لاحقاً' } 
      }));
    }

    setLoadingAction(null);
    handleCloseAddModal();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddStudentsToGroup = async () => {
    if (!selectedGroupForStudents || selectedStudents.length === 0) return;

    setLoadingAction(`add_students_${selectedGroupForStudents.id}`);

    const studentsToAdd = unassignedStudents.filter(s => selectedStudents.includes(s.id));

    // Update local state immediately
    setHalaqat(prev => prev.map(h => {
      if (h.id === selectedGroupForStudents.id) {
        return { ...h, students: [...h.students, ...studentsToAdd] };
      }
      return h;
    }));

    // Remove selected students from unassigned
    setUnassignedStudents(unassignedStudents.filter(s => !selectedStudents.includes(s.id)));

    // Update students in cache
    const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS) || [];
    const updatedStudents = cachedStudents.map((s: any) => {
      const sName = s[0] || s['الاسم الكامل'] || s['اسم الطالب'];
      if (studentsToAdd.some(st => st.name === sName)) {
        const newS = [...s];
        newS[11] = selectedGroupForStudents.name;
        return newS;
      }
      return s;
    });
    setCachedData(CACHE_KEYS.STUDENTS, updatedStudents);

    const cachedGroups = getCachedData(CACHE_KEYS.GROUPS) || [];
    updateDashboardCache(updatedStudents, cachedGroups);

    // Send to Google Sheets (one by one or batched, depending on backend)
    // Note: Once the first POST is successful, Google Sheets will automatically create the 'اسم الحلقة' column if it doesn't exist.
    for (const student of studentsToAdd) {
      const payload = {
        type: "UPDATE_STUDENT_GROUP",
        studentName: student.name,
        groupName: selectedGroupForStudents.name
      };

      try {
        console.log('Sending data to:', API_URL);
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload),
          mode: "no-cors"
        });
      } catch (err) {
        console.error("Error transferring student:", err);
        addToOfflineQueue(payload);
      }
    }

    setLoadingAction(null);
    handleCloseAddStudentsModal();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleTransferStudent = async (student: Student, fromHalaqaId: string, toHalaqaName: string) => {
    if (!toHalaqaName) return;
    
    setLoadingAction(`transfer_${student.id}`);

    // Update local state
    setHalaqat(prev => {
      const newHalaqat = JSON.parse(JSON.stringify(prev)) as Halaqa[];
      let studentToMove: Student | null = null;
      
      for (const h of newHalaqat) {
        if (h.id === fromHalaqaId) {
          const studentIndex = h.students.findIndex(s => s.id === student.id);
          if (studentIndex > -1) {
            studentToMove = h.students[studentIndex];
            h.students.splice(studentIndex, 1);
          }
          break;
        }
      }

      if (studentToMove) {
        for (const h of newHalaqat) {
          if (h.name === toHalaqaName) {
            h.students.push(studentToMove);
            break;
          }
        }
      }
      return newHalaqat;
    });

    // Update students in cache
    const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS) || [];
    const updatedStudents = cachedStudents.map((s: any) => {
      const sName = s[0] || s['الاسم الكامل'] || s['اسم الطالب'];
      if (sName === student.name) {
        const newS = [...s];
        newS[11] = toHalaqaName;
        return newS;
      }
      return s;
    });
    setCachedData(CACHE_KEYS.STUDENTS, updatedStudents);

    const cachedGroups = getCachedData(CACHE_KEYS.GROUPS) || [];
    updateDashboardCache(updatedStudents, cachedGroups);

    // Send to Google Sheets
    // Note: Once the first POST is successful, Google Sheets will automatically create the 'اسم الحلقة' column if it doesn't exist.
    const payload = {
      type: "UPDATE_STUDENT_GROUP",
      studentName: student.name,
      groupName: toHalaqaName
    };

    try {
      console.log('Sending data to:', API_URL);
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      });
    } catch (err) {
      console.error("Error transferring student:", err);
      addToOfflineQueue(payload);
    }

    setLoadingAction(null);
    setTransferState(null);
  };

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const filteredHalaqat = halaqat.map(h => ({
    ...h,
    students: h.students.filter(s => s.name.includes(searchQuery) || h.name.includes(searchQuery))
  })).filter(h => h.name.includes(searchQuery) || h.students.length > 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#425946]">
        <Loader2 size={48} className="animate-spin mb-4 text-[#BF9765]" />
        <p className="text-lg font-bold">جاري تحميل الحلقات...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#425946] flex items-center gap-2">
            <BookOpen size={28} className="text-[#BF9765]" />
            إدارة الحلقات
          </h2>
          <p className="text-gray-600 mt-2">إدارة الحلقات، تعيين المعلمين، وتوزيع الطلاب.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن طالب أو حلقة..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[#BF9765] focus:ring-1 focus:ring-[#BF9765] transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#425946] hover:bg-[#324335] text-white font-bold rounded-lg transition-colors shrink-0"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">إضافة حلقة</span>
          </button>
        </div>
      </div>

      {halaqat.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <BookOpen size={64} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-500 mb-6">لا توجد حلقات مسجلة حالياً</h3>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-8 py-4 bg-[#425946] hover:bg-[#324335] text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            <Plus size={24} />
            إضافة حلقة جديدة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredHalaqat.map((halaqa) => (
            <Card key={halaqa.id} className="bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow overflow-visible flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-[#425946]">{halaqa.name}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenEditModal(halaqa)} className="text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md" title="تعديل الحلقة">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => confirmDeleteGroup(halaqa)} className="text-[#d32f2f] hover:text-white transition-colors bg-[#d32f2f]/10 hover:bg-[#d32f2f] p-1.5 rounded-md" title="حذف الحلقة">
                      <Trash2 size={16} />
                    </button>
                    <span className="bg-[#BF9765]/10 text-[#BF9765] text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1">
                      <Users size={14} />
                      {halaqa.students.length}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {halaqa.teachers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <UserCog size={16} className="text-[#BF9765]" />
                      <span className="font-semibold">{t.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{t.role}</span>
                    </div>
                  ))}
                  {halaqa.teachers.length === 0 && (
                    <div className="text-sm text-gray-400 italic">لا يوجد معلم معين</div>
                  )}
                </div>
              </div>

              <div className="p-0 flex-1 overflow-y-auto max-h-64">
                {halaqa.students.length > 0 ? (
                  <ul className="divide-y divide-gray-50">
                    {halaqa.students.map(student => (
                      <li key={student.id} className="p-3 hover:bg-gray-50 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${student.isOrphan ? 'bg-[#BF9765]' : 'bg-gray-300'}`} title={student.isOrphan ? 'يتيم' : ''}></div>
                          <span className="text-sm font-medium text-gray-700">{student.name}</span>
                        </div>
                        
                        <div className="relative">
                          {loadingAction === `transfer_${student.id}` ? (
                            <Loader2 size={16} className="animate-spin text-[#BF9765]" />
                          ) : (
                            <button
                              onClick={() => setTransferState({ studentId: student.id, halaqaId: halaqa.id })}
                              className="p-1.5 text-gray-400 hover:text-[#425946] hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="نقل الطالب"
                            >
                              <ArrowLeftRight size={16} />
                            </button>
                          )}
                          
                          {transferState?.studentId === student.id && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1">
                              <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-gray-100">نقل إلى:</div>
                              <div className="max-h-40 overflow-y-auto">
                                {halaqat.filter(h => h.id !== halaqa.id).map(h => (
                                  <button
                                    key={h.id}
                                    onClick={() => handleTransferStudent(student, halaqa.id, h.name)}
                                    className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 text-gray-700 transition-colors"
                                  >
                                    {h.name}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setTransferState(null)}
                                className="w-full text-center px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t border-gray-100 transition-colors"
                              >
                                إلغاء
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    لا يوجد طلاب في هذه الحلقة
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => handleOpenAddStudentsModal(halaqa)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-[#BF9765] hover:text-[#BF9765] text-gray-600 font-medium rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  إضافة طلاب
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Group Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#425946] text-xl flex items-center gap-2">
                <BookOpen size={24} className="text-[#BF9765]" />
                {editingGroup ? 'تعديل حلقة' : 'إضافة حلقة جديدة'}
              </h3>
              <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#425946] mb-2">اسم الحلقة <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={newGroupData.groupName}
                      onChange={(e) => setNewGroupData({ ...newGroupData, groupName: e.target.value })}
                      placeholder="مثال: حلقة أبو بكر الصديق"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#BF9765] focus:ring-2 focus:ring-[#BF9765]/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#425946] mb-2">المعلم الرئيسي</label>
                    <select
                      value={newGroupData.teacherName}
                      onChange={(e) => setNewGroupData({ ...newGroupData, teacherName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#BF9765] focus:ring-2 focus:ring-[#BF9765]/20 transition-all bg-white"
                    >
                      <option value="">اختر المعلم...</option>
                      {teachersList.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#425946] mb-2">المعلم المساعد (اختياري)</label>
                    <input
                      type="text"
                      value={newGroupData.secondaryTeacher}
                      onChange={(e) => setNewGroupData({ ...newGroupData, secondaryTeacher: e.target.value })}
                      placeholder="اسم المعلم المساعد..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#BF9765] focus:ring-2 focus:ring-[#BF9765]/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#425946] mb-2">ملاحظات</label>
                    <textarea
                      value={newGroupData.notes}
                      onChange={(e) => setNewGroupData({ ...newGroupData, notes: e.target.value })}
                      placeholder="أي ملاحظات إضافية..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#BF9765] focus:ring-2 focus:ring-[#BF9765]/20 transition-all h-24 resize-none"
                    />
                  </div>
                </div>

                {!editingGroup && (
                  <div className="flex flex-col h-full">
                    <label className="block text-sm font-bold text-[#425946] mb-2 flex justify-between items-center">
                      <span>توزيع الطلاب (غير الموزعين)</span>
                      <span className="text-xs bg-[#BF9765] text-white px-2 py-1 rounded-full">{selectedStudents.length} محدد</span>
                    </label>
                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[200px]">
                      {unassignedStudents.length > 0 ? (
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                          {unassignedStudents.map(student => (
                            <label key={student.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(student.id) ? 'bg-[#425946]/10 border border-[#425946]/20' : 'hover:bg-gray-100 border border-transparent'}`}>
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                                className="w-4 h-4 text-[#425946] rounded border-gray-300 focus:ring-[#425946]"
                              />
                              <span className="text-sm font-medium text-gray-700">{student.name}</span>
                              {student.isOrphan && <span className="text-[10px] bg-[#BF9765]/20 text-[#BF9765] px-1.5 py-0.5 rounded">يتيم</span>}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-6 text-center">
                          جميع الطلاب موزعون حالياً على الحلقات.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseAddModal}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                disabled={loadingAction === 'add_group'}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={loadingAction === 'add_group' || loadingAction === 'edit_group'}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#425946] hover:bg-[#324335] text-white font-bold rounded-xl transition-colors disabled:opacity-70"
              >
                {loadingAction === 'add_group' || loadingAction === 'edit_group' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'حفظ الحلقة'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-red-50">
              <h3 className="font-bold text-[#d32f2f] text-xl flex items-center gap-2">
                <Trash2 size={24} />
                تأكيد الحذف
              </h3>
              <button onClick={() => setGroupToDelete(null)} className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <p className="text-gray-700 text-lg mb-2 font-medium">
                هل أنت متأكد من حذف هذه الحلقة؟
              </p>
              <p className="text-gray-500 text-sm">
                سيتم تحويل كافة طلابها إلى قائمة (غير الموزعين) تلقائياً.
              </p>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setGroupToDelete(null)}
                className="px-6 py-2.5 text-gray-600 hover:bg-gray-200 font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#d32f2f] hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
              >
                <Trash2 size={20} />
                حذف الحلقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {isAddStudentsModalOpen && selectedGroupForStudents && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-[#425946] text-xl flex items-center gap-2">
                <Users size={24} className="text-[#BF9765]" />
                إضافة طلاب لحلقة {selectedGroupForStudents.name}
              </h3>
              <button onClick={handleCloseAddStudentsModal} className="text-gray-400 hover:text-red-500 transition-colors bg-white rounded-full p-1 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col">
              <label className="block text-sm font-bold text-[#425946] mb-2 flex justify-between items-center">
                <span>الطلاب غير الموزعين</span>
                <span className="text-xs bg-[#BF9765] text-white px-2 py-1 rounded-full">{selectedStudents.length} محدد</span>
              </label>
              
              <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[300px]">
                {unassignedStudents.length > 0 ? (
                  <div className="overflow-y-auto p-2 space-y-1 flex-1">
                    {unassignedStudents.map(student => (
                      <label key={student.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(student.id) ? 'bg-[#425946]/10 border border-[#425946]/20' : 'hover:bg-gray-100 border border-transparent'}`}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 text-[#425946] rounded border-gray-300 focus:ring-[#425946]"
                        />
                        <span className="text-sm font-medium text-gray-700">{student.name}</span>
                        {student.isOrphan && <span className="text-[10px] bg-[#BF9765]/20 text-[#BF9765] px-1.5 py-0.5 rounded">يتيم</span>}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-6 text-center">
                    جميع الطلاب موزعون حالياً على الحلقات.
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseAddStudentsModal}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
                disabled={loadingAction === `add_students_${selectedGroupForStudents.id}`}
              >
                إلغاء
              </button>
              <button
                onClick={handleAddStudentsToGroup}
                disabled={loadingAction === `add_students_${selectedGroupForStudents.id}` || selectedStudents.length === 0}
                className="flex items-center gap-2 px-8 py-2.5 bg-[#425946] hover:bg-[#324335] text-white font-bold rounded-xl transition-colors disabled:opacity-70"
              >
                {loadingAction === `add_students_${selectedGroupForStudents.id}` ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إضافة الطلاب'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#425946] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-[#BF9765]" size={24} />
          <span className="font-bold">تم حفظ التغييرات بنجاح!</span>
        </div>
      )}
    </div>
  );
}
