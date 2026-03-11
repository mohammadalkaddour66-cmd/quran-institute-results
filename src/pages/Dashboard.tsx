import React, { useState, useEffect } from "react";
import Card from "../components/Card";
import { Users, UserCheck, Heart, BookOpen, TrendingUp, UserPlus, FileText, Award, ArrowUpCircle, ArrowDownCircle, User, Plus, Edit, Trash2 } from "lucide-react";
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, fetchWithFallback } from '../utils/syncUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

// Custom CountUp Component
const CountUp = ({ end, duration = 2 }: { end: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [end, duration]);

  return <span>{count}</span>;
};

// Glassmorphism Stat Card
const GlassCard = ({ title, value, icon, suffix = "" }: { title: string, value: number | string, icon: React.ReactNode, suffix?: string }) => (
  <div className="relative overflow-hidden bg-white/70 backdrop-blur-lg p-6 rounded-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(66,89,70,0.05)] flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_0_rgba(66,89,70,0.1)]">
    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-[#BF9765]/20 to-transparent rounded-full blur-2xl pointer-events-none"></div>
    <div className="w-14 h-14 bg-gradient-to-br from-[#425946] to-[#5a7a60] text-[#BF9765] rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-600 font-semibold mb-1">{title}</p>
      <p className="text-2xl font-bold text-[#425946]">
        {typeof value === 'number' ? <CountUp end={value} /> : value}
        {suffix && <span className="text-sm font-normal text-gray-500 mr-1">{suffix}</span>}
      </p>
    </div>
  </div>
);

const StatisticsTab = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalGroups: 0,
    totalOrphans: 0,
    attendanceTrend: [] as any[],
    groupDensity: [] as any[],
    orphanRatio: [] as any[],
  });

  const processData = (result: any) => {
    if (!result) return;

    const students = result.students || [];
    const staff = result.staff || [];
    const groups = result.groups || [];
    const attendance = result.attendance || [];

    const totalStudents = students.length;
    const totalStaff = staff.length;
    const totalGroups = groups.length;

    // Filter the students array where Index 10 (the 'يتيم؟' column) is equal to 'نعم'
    const totalOrphans = students.filter((s: any) => s[10] === 'نعم').length;

    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStrISO = date.toISOString().split('T')[0];
      
      const dayAbsences = attendance.filter((a: any) => {
        const recordDate = a[4]; // Index 4 for Date
        const type = a[0]; // Index 0 for Type
        
        const isMatchDate = recordDate && recordDate.includes(dateStrISO);
        const isAbsence = type === 'غياب';
        
        return isMatchDate && isAbsence;
      }).length;
      
      const present = Math.max(0, totalStudents - dayAbsences);
      const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;
      
      attendanceTrend.push({
        name: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        'نسبة الحضور': percentage
      });
    }

    const groupCounts: Record<string, number> = {};
    
    // Initialize group counts from groups sheet
    groups.forEach((g: any) => {
      const circleName = g[0] || g[1]; // Guessing index 0 or 1 for circle name
      if (circleName) {
        groupCounts[circleName] = 0;
      }
    });

    students.forEach((s: any) => {
      let circle = 'غير محدد';
      // Try to find a matching circle name in the student's row
      const foundCircle = Object.keys(groupCounts).find(c => s.includes(c));
      if (foundCircle) {
        circle = foundCircle;
      } else {
        // Fallback: look for a string containing "حلقة" or use index 8/9
        for (let i = 0; i < s.length; i++) {
          if (typeof s[i] === 'string' && s[i].includes('حلقة')) {
            circle = s[i];
            break;
          }
        }
        if (circle === 'غير محدد') {
          circle = s[8] || s[9] || 'غير محدد';
        }
      }
      
      if (groupCounts[circle] !== undefined) {
        groupCounts[circle]++;
      } else {
        groupCounts[circle] = (groupCounts[circle] || 0) + 1;
      }
    });
    
    const groupDensity = Object.keys(groupCounts).map(key => ({
      name: key,
      'عدد الطلاب': groupCounts[key]
    }));

    const orphanRatio = [
      { name: 'أيتام', value: totalOrphans },
      { name: 'غير أيتام', value: Math.max(0, totalStudents - totalOrphans) }
    ];

    setData({
      totalStudents,
      totalStaff,
      totalGroups,
      totalOrphans,
      attendanceTrend,
      groupDensity,
      orphanRatio
    });
  };

  useEffect(() => {
    const fetchDashboardData = async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = getCachedData('dashboard_raw');
        if (cached) {
          processData(cached);
          setIsLoading(false);
        }
      } else {
        setIsLoading(true);
      }

      try {
        const d = new Date();
        const suffix = `_${d.getMonth() + 1}_${d.getFullYear()}`;
        
        const result = await fetchWithFallback(`${API_URL}?action=getFullData&suffix=${suffix}`);
        
        setCachedData('dashboard_raw', result);
        processData(result);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Listen for background sync completion to auto-update
    const handleSyncComplete = () => fetchDashboardData(true);
    window.addEventListener('sync-complete', handleSyncComplete);
    
    const handleForceRefresh = () => fetchDashboardData(true);
    window.addEventListener('force-refresh', handleForceRefresh);

    // Listen for local state updates
    const handleLocalUpdate = (e: any) => {
      if (e.detail.key === 'dashboard_raw') {
        processData(e.detail.data);
      }
    };
    window.addEventListener('local-storage-update', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete);
      window.removeEventListener('force-refresh', handleForceRefresh);
      window.removeEventListener('local-storage-update', handleLocalUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="h-80 bg-gray-200 rounded-2xl"></div>
          <div className="h-80 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const COLORS = ['#BF9765', '#425946'];

  return (
    <div className="space-y-8 w-full animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-[#425946]">مركز القيادة والإحصائيات</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard title="إجمالي الطلاب" value={data.totalStudents} icon={<Users size={24} />} />
        <GlassCard title="الطلاب الأيتام" value={data.totalOrphans} icon={<Heart size={24} />} />
        <GlassCard title="إجمالي الكادر" value={data.totalStaff} icon={<UserCheck size={24} />} />
        <GlassCard title="إجمالي الحلقات" value={data.totalGroups} icon={<BookOpen size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Chart */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(66,89,70,0.05)]">
          <h4 className="text-lg font-bold text-[#425946] mb-6">نسبة الحضور الأسبوعية (%)</h4>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ stroke: '#F3F4F6', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Line type="monotone" dataKey="نسبة الحضور" stroke="#425946" strokeWidth={4} dot={{ fill: '#BF9765', strokeWidth: 2, r: 6 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Group Density Chart */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(66,89,70,0.05)]">
          <h4 className="text-lg font-bold text-[#425946] mb-6">كثافة الطلاب في الحلقات</h4>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.groupDensity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="عدد الطلاب" fill="#425946" radius={[4, 4, 0, 0]} barSize={32}>
                  {data.groupDensity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#425946' : '#BF9765'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orphan Ratio Pie Chart */}
        <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(66,89,70,0.05)] lg:col-span-2">
          <h4 className="text-lg font-bold text-[#425946] mb-6 text-center">نسبة الأيتام</h4>
          <div className="h-[300px] w-full" dir="ltr">
            {data.totalStudents > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.orphanRatio}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.orphanRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">لا يوجد بيانات</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CirclesTab = () => {
  const [filters, setFilters] = useState({ gender: "" });
  
  const circles = [
    { id: 1, name: "حلقة أبو بكر الصديق", gender: "ذكر", studentsCount: 15, teachers: "أحمد محمد (معلم رئيسي)" },
    { id: 2, name: "حلقة عمر بن الخطاب", gender: "ذكر", studentsCount: 12, teachers: "محمود عبد الله (معلم رئيسي)" },
    { id: 3, name: "حلقة خديجة بنت خويلد", gender: "أنثى", studentsCount: 18, teachers: "فاطمة علي (معلم رئيسي)" },
  ];

  const filtered = circles.filter(c => {
    return filters.gender ? c.gender === filters.gender : true;
  });

  return (
    <div className="space-y-4 w-full animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-[#425946]">إدارة الحلقات</h3>
        <button className="flex items-center gap-2 bg-[#425946] text-white px-4 py-2 rounded-lg hover:bg-[#BF9765] transition-colors">
          <Plus size={18} />
          <span>إضافة حلقة</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#F2F2F2] p-4 rounded-lg border border-soft-secondary/30 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-bold text-[#425946] mb-1">جنس الطلاب في الحلقة</label>
          <select value={filters.gender} onChange={e => setFilters({ gender: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]">
            <option value="">الكل</option>
            <option value="ذكر">ذكور</option>
            <option value="أنثى">إناث</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-soft-secondary/30">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#F2F2F2] text-[#425946]">
            <tr>
              <th className="px-4 py-3 font-bold">اسم الحلقة</th>
              <th className="px-4 py-3 font-bold">جنس الطلاب</th>
              <th className="px-4 py-3 font-bold">عدد الطلاب</th>
              <th className="px-4 py-3 font-bold">المعلمون</th>
              <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(circle => (
              <tr key={circle.id} className="border-b border-soft-secondary/10 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{circle.name}</td>
                <td className="px-4 py-3">{circle.gender === 'ذكر' ? 'ذكور' : 'إناث'}</td>
                <td className="px-4 py-3">{circle.studentsCount}</td>
                <td className="px-4 py-3">{circle.teachers}</td>
                <td className="px-4 py-3 flex justify-center gap-2">
                  <button className="text-[#BF9765] hover:text-[#425946]"><Edit size={18} /></button>
                  <button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">لا يوجد نتائج مطابقة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentsTab = () => {
  const [filters, setFilters] = useState({ isOrphan: "", age: "", currentJuz: "", circle: "", gender: "" });
  
  const students = [
    { id: 1, name: "عمر خالد", studentId: "STU-001", gender: "ذكر", status: "منتظم", city: "الرياض", isOrphan: "لا", familyBook: "123456", phone: "0501234567", birthDate: "2010-05-15", circle: "حلقة أبو بكر الصديق", latestRecitationPage: 45 },
    { id: 2, name: "مريم أحمد", studentId: "STU-002", gender: "أنثى", status: "منتظم", city: "جدة", isOrphan: "نعم", familyBook: "654321", phone: "0507654321", birthDate: "2012-08-22", circle: "حلقة خديجة بنت خويلد", latestRecitationPage: 600 },
    { id: 3, name: "علي حسن", studentId: "STU-003", gender: "ذكر", status: "منقطع", city: "الدمام", isOrphan: "لا", familyBook: "987654", phone: "0509876543", birthDate: "2008-11-10", circle: "حلقة عمر بن الخطاب", latestRecitationPage: 120 },
  ];

  const calculateAge = (birthDate: string) => {
    const today = new Date("2026-03-06T05:39:57-08:00");
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateJuz = (page: number) => {
    if (!page || page < 1) return 1;
    if (page > 604) return 30;
    return Math.ceil(page / 20.13); // Approximate Juz calculation based on standard 604 pages
  };

  const filtered = students.filter(s => {
    const age = calculateAge(s.birthDate);
    const juz = calculateJuz(s.latestRecitationPage);

    return (
      (filters.isOrphan ? s.isOrphan === filters.isOrphan : true) &&
      (filters.age ? age.toString() === filters.age : true) &&
      (filters.currentJuz ? juz.toString() === filters.currentJuz : true) &&
      (filters.circle ? s.circle.includes(filters.circle) : true) &&
      (filters.gender ? s.gender === filters.gender : true)
    );
  });

  return (
    <div className="space-y-4 w-full animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-[#425946]">إدارة الطلاب</h3>
      </div>

      {/* Filters */}
      <div className="bg-[#F2F2F2] p-4 rounded-lg border border-soft-secondary/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">هل الطالب يتيم</label>
          <select value={filters.isOrphan} onChange={e => setFilters({...filters, isOrphan: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]">
            <option value="">الكل</option>
            <option value="نعم">نعم</option>
            <option value="لا">لا</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">العمر</label>
          <input type="number" value={filters.age} onChange={e => setFilters({...filters, age: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" placeholder="بحث بالعمر..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">الجزء الحالي</label>
          <input type="number" value={filters.currentJuz} onChange={e => setFilters({...filters, currentJuz: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" placeholder="رقم الجزء..." min="1" max="30" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">الحلقة</label>
          <input type="text" value={filters.circle} onChange={e => setFilters({...filters, circle: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" placeholder="اسم الحلقة..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">الجنس</label>
          <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]">
            <option value="">الكل</option>
            <option value="ذكر">ذكر</option>
            <option value="أنثى">أنثى</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-soft-secondary/30">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#F2F2F2] text-[#425946]">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">رقم الطالب</th>
              <th className="px-4 py-3 font-bold">الجنس</th>
              <th className="px-4 py-3 font-bold">العمر</th>
              <th className="px-4 py-3 font-bold">الحلقة</th>
              <th className="px-4 py-3 font-bold">الجزء الحالي</th>
              <th className="px-4 py-3 font-bold">يتيم</th>
              <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(student => {
              const age = calculateAge(student.birthDate);
              const juz = calculateJuz(student.latestRecitationPage);
              return (
                <tr key={student.id} className="border-b border-soft-secondary/10 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{student.studentId}</td>
                  <td className="px-4 py-3">{student.gender}</td>
                  <td className="px-4 py-3">{age} سنة</td>
                  <td className="px-4 py-3">{student.circle}</td>
                  <td className="px-4 py-3">الجزء {juz}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${student.isOrphan === 'نعم' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {student.isOrphan}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button className="text-[#BF9765] hover:text-[#425946]"><Edit size={18} /></button>
                    <button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">لا يوجد طلاب مطابقين للبحث</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TeachersTab = () => {
  const teachers = [
    { id: 1, name: "أحمد محمد", qualification: "بكالوريوس شريعة", gender: "ذكر", phone: "0501112223" },
    { id: 2, name: "فاطمة علي", qualification: "إجازة في القرآن", gender: "أنثى", phone: "0504445556" },
  ];

  return (
    <div className="space-y-4 w-full animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-[#425946]">إدارة المدرسين</h3>
        <button className="flex items-center gap-2 bg-[#425946] text-white px-4 py-2 rounded-lg hover:bg-[#BF9765] transition-colors">
          <Plus size={18} />
          <span>إضافة معلم جديد</span>
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-soft-secondary/30">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#F2F2F2] text-[#425946]">
            <tr>
              <th className="px-4 py-3 font-bold">صورة شخصية</th>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold">المؤهل العلمي</th>
              <th className="px-4 py-3 font-bold">الجنس</th>
              <th className="px-4 py-3 font-bold">رقم الهاتف</th>
              <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(teacher => (
              <tr key={teacher.id} className="border-b border-soft-secondary/10 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                    <User size={20} />
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{teacher.name}</td>
                <td className="px-4 py-3 text-gray-600">{teacher.qualification}</td>
                <td className="px-4 py-3 text-gray-600">{teacher.gender}</td>
                <td className="px-4 py-3 text-gray-600" dir="ltr" style={{textAlign: 'right'}}>{teacher.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2 items-center h-full mt-2">
                    <button className="text-[#BF9765] hover:text-[#425946]"><Edit size={18} /></button>
                    <button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">لا يوجد معلمين مسجلين</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ExamsTab = () => {
  const [filters, setFilters] = useState({ studentName: "", examType: "", scoreGrade: "", startDate: "", endDate: "" });

  const [exams, setExams] = useState<{ id: number; studentName: string; examType: string; score?: number; date: string }[]>([
    { id: 1, studentName: "عمر خالد", examType: "اختبار جزء عم", score: 95, date: "2023-10-15" },
    { id: 2, studentName: "مريم أحمد", examType: "اختبار سورة البقرة", score: 88, date: "2023-10-20" },
    { id: 3, studentName: "علي حسن", examType: "اختبار نصف القرآن", score: 75, date: "2023-11-01" },
    { id: 4, studentName: "فاطمة محمد", examType: "اختبار الأجزاء الخمسة", score: 65, date: "2023-11-15" },
  ]);

  const filtered = exams.filter(e => {
    // Score filtering
    let scoreMatch = true;
    if (filters.scoreGrade && e.score !== undefined) {
      if (filters.scoreGrade === "ممتاز") scoreMatch = e.score >= 90;
      else if (filters.scoreGrade === "جيد جداً") scoreMatch = e.score >= 80 && e.score < 90;
      else if (filters.scoreGrade === "جيد") scoreMatch = e.score >= 70 && e.score < 80;
      else if (filters.scoreGrade === "مقبول") scoreMatch = e.score < 70;
    } else if (filters.scoreGrade && e.score === undefined) {
      scoreMatch = false;
    }

    // Date filtering
    let dateMatch = true;
    if (filters.startDate && e.date < filters.startDate) dateMatch = false;
    if (filters.endDate && e.date > filters.endDate) dateMatch = false;

    return (
      e.studentName.includes(filters.studentName) &&
      e.examType.includes(filters.examType) &&
      scoreMatch &&
      dateMatch
    );
  });

  return (
    <div className="space-y-6 w-full animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-[#425946]">إدارة الاختبارات</h3>
      </div>

      {/* Filters */}
      <div className="bg-[#F2F2F2] p-4 rounded-lg border border-soft-secondary/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">الطالب</label>
          <input type="text" value={filters.studentName} onChange={e => setFilters({...filters, studentName: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" placeholder="بحث..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">نوع الاختبار</label>
          <input type="text" value={filters.examType} onChange={e => setFilters({...filters, examType: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" placeholder="بحث..." />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">النتيجة (التقدير)</label>
          <select value={filters.scoreGrade} onChange={e => setFilters({...filters, scoreGrade: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]">
            <option value="">الكل</option>
            <option value="ممتاز">ممتاز (90 فأكثر)</option>
            <option value="جيد جداً">جيد جداً (80 - 89)</option>
            <option value="جيد">جيد (70 - 79)</option>
            <option value="مقبول">مقبول (أقل من 70)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">من تاريخ</label>
          <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#425946] mb-1">إلى تاريخ</label>
          <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:border-[#BF9765]" />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-soft-secondary/30">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#F2F2F2] text-[#425946]">
            <tr>
              <th className="px-4 py-3 font-bold">اسم الطالب</th>
              <th className="px-4 py-3 font-bold">نوع الاختبار</th>
              <th className="px-4 py-3 font-bold">النتيجة</th>
              <th className="px-4 py-3 font-bold">التاريخ</th>
              <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(exam => (
              <tr key={exam.id} className="border-b border-soft-secondary/10 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{exam.studentName}</td>
                <td className="px-4 py-3 text-gray-600">{exam.examType}</td>
                <td className="px-4 py-3 font-bold text-[#425946]">{exam.score !== undefined ? exam.score : '-'}</td>
                <td className="px-4 py-3 text-gray-600" dir="ltr" style={{textAlign: 'right'}}>{exam.date}</td>
                <td className="px-4 py-3 flex justify-center gap-2">
                  <button className="text-[#BF9765] hover:text-[#425946]"><Edit size={18} /></button>
                  <button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">لا يوجد نتائج مطابقة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("الرئيسية");

  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveSection(e.detail);
    };
    window.addEventListener("dashboard-tab-change", handleTabChange);
    return () => window.removeEventListener("dashboard-tab-change", handleTabChange);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "الرئيسية":
        return <StatisticsTab />;
      case "الحلقات":
        return <CirclesTab />;
      case "الطلاب":
        return <StudentsTab />;
      case "المدرسين":
        return <TeachersTab />;
      case "الاختبارات":
        return <ExamsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Main Content Area */}
      <Card className="min-h-[400px] flex items-start justify-start bg-white border-none shadow-lg p-6">
        {renderContent()}
      </Card>
    </div>
  );
}
