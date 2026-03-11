import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Search, Download, Loader2, BarChart3, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import Card from '../components/Card';
import { CACHE_KEYS, API_URL, getCachedData, setCachedData, fetchWithFallback } from '../utils/syncUtils';

const reportTypes = [
  'تقرير معلومات الطالب الشخصية',
  'تقرير بيانات طلاب الحلقة',
  'تقرير سير اختبارات طالب',
  'تقرير غياب طالب',
  'تقرير الغياب اليومي لكل الطلاب',
  'سجل تسميع طالب',
  'إحصاء الطلاب الأيتام',
  'تقرير إحصاء الغياب والتأخر'
];

const groupsList = ['حلقة أبو بكر', 'حلقة عمر', 'حلقة خديجة'];

const getReportConfig = (type: string) => {
  switch (type) {
    case 'تقرير معلومات الطالب الشخصية':
      return {
        filters: ['studentName'],
        columns: ['اسم الطالب', 'تاريخ الميلاد', 'رقم الهاتف', 'العنوان', 'تاريخ التسجيل'],
        data: [
          ['عمر خالد', '2010-05-12', '0501234567', 'الرياض', '2023-09-01'],
          ['علي حسن', '2011-08-22', '0507654321', 'جدة', '2023-09-05'],
          ['يوسف محمود', '2012-03-15', '0509876543', 'الدمام', '2023-09-10'],
        ]
      };
    case 'تقرير بيانات طلاب الحلقة':
      return {
        filters: ['groupName'],
        columns: ['اسم الطالب', 'الحلقة', 'المعلم', 'مستوى الحفظ'],
        data: [
          ['عمر خالد', 'حلقة أبو بكر', 'أحمد محمد', 'جزء عم'],
          ['علي حسن', 'حلقة أبو بكر', 'أحمد محمد', 'جزء تبارك'],
          ['مريم أحمد', 'حلقة خديجة', 'فاطمة علي', 'القرآن كاملاً'],
        ]
      };
    case 'تقرير سير اختبارات طالب':
      return {
        filters: ['studentName', 'groupName'],
        columns: ['اسم الطالب', 'الحلقة', 'نوع الاختبار', 'النتيجة', 'التاريخ'],
        data: [
          ['عمر خالد', 'حلقة أبو بكر', 'اختبار جزء', 'ممتاز', '2023-10-15'],
          ['مريم أحمد', 'حلقة خديجة', 'اختبار سبر', 'جيد جداً', '2023-10-20'],
        ]
      };
    case 'تقرير غياب طالب':
      return {
        filters: ['studentName', 'fromDate', 'toDate'],
        columns: ['اسم الطالب', 'التاريخ', 'الحالة', 'السبب'],
        data: [
          ['عمر خالد', '2023-11-01', 'غياب بعذر', 'مرض'],
          ['عمر خالد', '2023-11-05', 'تأخر', 'ازدحام مروري'],
        ]
      };
    case 'تقرير الغياب اليومي لكل الطلاب':
      return {
        filters: ['fromDate', 'toDate'],
        columns: ['اسم الطالب', 'الحلقة', 'التاريخ', 'الحالة'],
        data: [
          ['عمر خالد', 'حلقة أبو بكر', '2023-11-01', 'غياب'],
          ['مريم أحمد', 'حلقة خديجة', '2023-11-01', 'تأخر'],
          ['طارق زياد', 'حلقة عمر', '2023-11-01', 'غياب بدون عذر'],
        ]
      };
    case 'سجل تسميع طالب':
      return {
        filters: ['studentName', 'fromDate', 'toDate'],
        columns: ['اسم الطالب', 'التاريخ', 'نوع التسميع', 'المقطع', 'النتيجة', 'الدرجة'],
        data: [
          ['عمر خالد', '2023-11-01', 'حفظ جديد', 'سورة البقرة ص 12', 'ممتاز', '95'],
          ['عمر خالد', '2023-11-02', 'مراجعة', 'سورة الفاتحة', 'جيد جداً', '85'],
        ]
      };
    case 'إحصاء الطلاب الأيتام':
      return {
        filters: ['groupName'],
        columns: ['اسم الطالب', 'الحلقة', 'تاريخ الميلاد', 'ملاحظات'],
        data: [
          ['يوسف محمود', 'حلقة أبو بكر', '2012-03-15', 'مكفول'],
          ['سارة محمد', 'حلقة خديجة', '2013-07-20', 'غير مكفول'],
        ]
      };
    case 'تقرير إحصاء الغياب والتأخر':
      return {
        filters: ['groupName', 'fromDate', 'toDate'],
        columns: ['اسم الطالب', 'الحلقة', 'عدد الغيابات', 'عدد التأخرات'],
        data: [
          ['عمر خالد', 'حلقة أبو بكر', '3', '1'],
          ['مريم أحمد', 'حلقة خديجة', '0', '4'],
          ['علي حسن', 'حلقة أبو بكر', '1', '0'],
        ]
      };
    default:
      return { filters: [], columns: [], data: [] };
  }
};

export default function ReportsDashboard() {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [studentsList, setStudentsList] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    studentName: '',
    groupName: '',
    fromDate: '',
    toDate: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<{ columns: string[], data: string[][] } | null>(null);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: number, direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchStudents = async (forceRefresh = false) => {
      // 1. Instant Loading (Cache)
      if (!forceRefresh) {
        const cachedStudents = getCachedData(CACHE_KEYS.STUDENTS);
        if (cachedStudents && Array.isArray(cachedStudents)) {
          const mapped = cachedStudents.map((item: any) => typeof item === 'object' ? (item['الاسم الكامل'] || item['اسم الطالب'] || item.name || Object.values(item)[0]) : item);
          setStudentsList(mapped);
        }
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
      }
    };

    fetchStudents();

    const handleForceRefresh = () => fetchStudents(true);
    window.addEventListener('force-refresh', handleForceRefresh);
    return () => window.removeEventListener('force-refresh', handleForceRefresh);
  }, []);

  const currentConfig = useMemo(() => getReportConfig(selectedReport), [selectedReport]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateReport = () => {
    if (!selectedReport) return;
    
    setIsLoading(true);
    setReportData(null);
    
    // Simulate API call
    setTimeout(() => {
      setReportData({
        columns: currentConfig.columns,
        data: currentConfig.data
      });
      setIsLoading(false);
    }, 800);
  };

  const handleExportExcel = () => {
    // Simulate Excel export
    alert('جاري تصدير التقرير إلى Excel...');
  };

  const filteredStudents = studentsList.filter(s => 
    s.toLowerCase().includes(filters.studentName.toLowerCase())
  );

  const sortedData = useMemo(() => {
    if (!reportData) return [];
    
    let sortableData = [...reportData.data];
    
    if (searchQuery) {
      sortableData = sortableData.filter(row => 
        row.some(cell => cell.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [reportData, sortConfig, searchQuery]);

  const requestSort = (key: number) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <Card className="shadow-lg border-none">
        <div className="mb-8 border-b border-soft-secondary/30 pb-4 flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">التقارير والإحصائيات</h2>
            <p className="text-neutral-text mt-1">توليد تقارير مرنة وشاملة لجميع بيانات المعهد.</p>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="space-y-6 bg-background/30 p-6 rounded-xl border border-soft-secondary/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Type Selector */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                نوع التقرير
              </label>
              <select
                value={selectedReport}
                onChange={(e) => {
                  setSelectedReport(e.target.value);
                  setReportData(null);
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white appearance-none"
              >
                <option value="">اختر التقرير المطلوب...</option>
                {reportTypes.map((type, idx) => (
                  <option key={`${type}-${idx}`} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Filters */}
            {selectedReport && (
              <div className="md:col-span-2 lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentConfig.filters.includes('studentName') && (
                  <div className="relative">
                    <label className="block text-sm font-semibold text-primary mb-2">اسم الطالب</label>
                    <input
                      type="text"
                      name="studentName"
                      value={filters.studentName}
                      onChange={(e) => {
                        handleFilterChange(e);
                        setShowStudentSuggestions(true);
                      }}
                      onFocus={() => setShowStudentSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                      className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white"
                      placeholder="اكتب اسم الطالب..."
                      autoComplete="off"
                    />
                    {showStudentSuggestions && filters.studentName && filteredStudents.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 bg-white border border-soft-secondary/50 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredStudents.map((student, idx) => (
                          <li
                            key={`${student}-${idx}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFilters(prev => ({ ...prev, studentName: student }));
                              setShowStudentSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-soft-secondary/20 cursor-pointer text-primary transition-colors"
                          >
                            {student}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {currentConfig.filters.includes('groupName') && (
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">الحلقة</label>
                    <select
                      name="groupName"
                      value={filters.groupName}
                      onChange={handleFilterChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white appearance-none"
                    >
                      <option value="">كل الحلقات</option>
                      {groupsList.map((group, idx) => (
                        <option key={`${group}-${idx}`} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentConfig.filters.includes('fromDate') && (
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">من تاريخ</label>
                    <input
                      type="date"
                      name="fromDate"
                      value={filters.fromDate}
                      onChange={handleFilterChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white"
                    />
                  </div>
                )}

                {currentConfig.filters.includes('toDate') && (
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">إلى تاريخ</label>
                    <input
                      type="date"
                      name="toDate"
                      value={filters.toDate}
                      onChange={handleFilterChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-soft-secondary/20">
            <button
              onClick={handleGenerateReport}
              disabled={!selectedReport || isLoading}
              className="px-8 py-2.5 bg-accent hover:bg-[#a88254] text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>جاري التحضير...</span>
                </>
              ) : (
                <>
                  <Filter size={20} />
                  <span>عرض التقرير</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Results */}
        {reportData && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h3 className="text-xl font-bold text-primary">{selectedReport}</h3>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في التقرير..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent text-sm bg-background/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-text" size={16} />
              </div>
            </div>

            <div className="overflow-x-auto border border-soft-secondary/30 rounded-lg">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-neutral-text bg-soft-secondary/10 border-b border-soft-secondary/30">
                  <tr>
                    {reportData.columns.map((col, index) => (
                      <th 
                        key={index} 
                        className="px-4 py-3 font-semibold cursor-pointer hover:bg-soft-secondary/20 transition-colors"
                        onClick={() => requestSort(index)}
                      >
                        <div className="flex items-center gap-1">
                          {col}
                          {sortConfig?.key === index ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          ) : (
                            <div className="w-3.5" /> // Placeholder for alignment
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length > 0 ? (
                    sortedData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-soft-secondary/10 hover:bg-background/50 transition-colors">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className={`px-4 py-3 ${cellIndex === 0 ? 'font-medium text-primary' : 'text-neutral-text'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={reportData.columns.length} className="px-4 py-8 text-center text-neutral-text">
                        لا توجد بيانات مطابقة للبحث أو الفلاتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleExportExcel}
                className="px-6 py-2.5 bg-soft-secondary/20 hover:bg-primary hover:text-white text-primary font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <Download size={20} />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
