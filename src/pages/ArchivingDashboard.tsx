import React, { useState, useRef } from 'react';
import { Archive, UploadCloud, FileText, Folder, Trash2, Download, Search, CheckCircle2, AlertCircle, File } from 'lucide-react';
import Card from '../components/Card';

type ArchiveFile = {
  id: string;
  name: string;
  category: string;
  date: string;
  size: string;
};

const initialFiles: ArchiveFile[] = [
  { id: '1', name: 'شهادة_عمر_خالد.pdf', category: 'ملفات الطلاب', date: '2023-10-15', size: '2.4 MB' },
  { id: '2', name: 'عقد_عمل_أحمد_محمد.pdf', category: 'ملفات الكادر', date: '2023-10-10', size: '1.1 MB' },
  { id: '3', name: 'التقرير_المالي_الربع_الثالث.xlsx', category: 'التقارير المالية', date: '2023-10-01', size: '3.5 MB' },
  { id: '4', name: 'تعميم_رقم_15.pdf', category: 'التعاميم والقرارات', date: '2023-09-28', size: '0.8 MB' },
];

const categories = [
  { name: 'ملفات الطلاب', count: 145, icon: <Folder size={24} /> },
  { name: 'ملفات الكادر', count: 32, icon: <Folder size={24} /> },
  { name: 'التقارير المالية', count: 12, icon: <Folder size={24} /> },
  { name: 'التعاميم والقرارات', count: 48, icon: <Folder size={24} /> },
];

export default function ArchivingDashboard() {
  const [files, setFiles] = useState<ArchiveFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadCategory, setUploadCategory] = useState('ملفات الطلاب');
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFile = uploadedFiles[0];
    
    // Simulate file upload
    const newArchiveFile: ArchiveFile = {
      id: Date.now().toString(),
      name: newFile.name,
      category: uploadCategory,
      date: new Date().toISOString().split('T')[0],
      size: (newFile.size / (1024 * 1024)).toFixed(2) + ' MB',
    };

    setFiles([newArchiveFile, ...files]);
    setToastMessage('تم رفع الملف بنجاح!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
    setToastMessage('تم حذف الملف بنجاح!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDownloadFile = (name: string) => {
    setToastMessage(`جاري تحميل ${name}...`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Filter files
  const filteredFiles = files.filter(file => {
    const matchSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory ? file.category === selectedCategory : true;
    return matchSearch && matchCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <Card className="shadow-lg border-none">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-accent/10 rounded-lg text-accent">
            <Archive size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">الأرشفة الإلكترونية</h2>
            <p className="text-neutral-text mt-1">إدارة، حفظ، واسترجاع الوثائق والملفات الخاصة بالمعهد.</p>
          </div>
        </div>
      </Card>

      {/* Folders/Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, index) => (
          <div 
            key={index}
            onClick={() => setSelectedCategory(selectedCategory === cat.name ? '' : cat.name)}
            className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
              selectedCategory === cat.name 
                ? 'bg-accent text-white border-accent shadow-md transform -translate-y-1' 
                : 'bg-white border-soft-secondary/50 text-primary hover:border-accent hover:shadow-md'
            }`}
          >
            <div className={`p-3 rounded-lg inline-block mb-4 ${
              selectedCategory === cat.name ? 'bg-white/20' : 'bg-soft-secondary/20 text-accent'
            }`}>
              {cat.icon}
            </div>
            <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
            <p className={`text-sm ${selectedCategory === cat.name ? 'text-white/80' : 'text-neutral-text'}`}>
              {cat.count} ملف
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <Card className="shadow-lg border-none lg:col-span-1 h-fit">
          <h3 className="text-lg font-bold text-primary mb-4 border-b border-soft-secondary/30 pb-2">رفع ملف جديد</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">تصنيف الملف</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 appearance-none"
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div 
              className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-soft-secondary/50 border-dashed rounded-xl hover:bg-background/50 hover:border-accent transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-2 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-neutral-text group-hover:text-accent transition-colors" />
                <div className="text-sm text-primary font-semibold">
                  <span>اضغط لاختيار ملف</span> أو اسحب وأفلت هنا
                </div>
                <p className="text-xs text-neutral-text">
                  PDF, DOCX, XLSX, JPG حتى 10MB
                </p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
              />
            </div>
          </div>
        </Card>

        {/* Files Table Section */}
        <Card className="shadow-lg border-none lg:col-span-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-soft-secondary/30 pb-4">
            <h3 className="text-lg font-bold text-primary">
              {selectedCategory ? `ملفات: ${selectedCategory}` : 'أحدث الملفات'}
            </h3>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن ملف..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-soft-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors bg-background/50 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-text" size={18} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-xs text-neutral-text bg-background/50 border-b border-soft-secondary/30">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tr-lg">اسم الملف</th>
                  <th className="px-4 py-3 font-semibold">التصنيف</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الرفع</th>
                  <th className="px-4 py-3 font-semibold">الحجم</th>
                  <th className="px-4 py-3 font-semibold text-center rounded-tl-lg">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <tr key={file.id} className="border-b border-soft-secondary/10 hover:bg-background/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-primary flex items-center gap-2">
                        <FileText size={16} className="text-accent shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]" title={file.name}>{file.name}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-text">
                        <span className="px-2 py-1 bg-soft-secondary/20 text-primary rounded text-xs">
                          {file.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-text" dir="ltr" style={{ textAlign: 'right' }}>{file.date}</td>
                      <td className="px-4 py-3 text-neutral-text" dir="ltr" style={{ textAlign: 'right' }}>{file.size}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadFile(file.name)}
                            className="p-1.5 text-primary hover:bg-soft-secondary/30 rounded transition-colors"
                            title="تحميل"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 text-[#D9534F] hover:bg-[#D9534F]/10 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-text">
                      لا توجد ملفات مطابقة للبحث أو الفلتر.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-8 bg-primary text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
          <CheckCircle2 className="text-accent" size={24} />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
