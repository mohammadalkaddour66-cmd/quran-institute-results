import React from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  Mic,
  Clock,
  FileText,
  BarChart,
  Archive,
  Settings,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ isOpen, toggleSidebar, activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { name: "لوحة التحكم", icon: <LayoutDashboard size={20} /> },
    { name: "تسجيل الطلاب", icon: <Users size={20} /> },
    { name: "تسجيل الكادر", icon: <UserCog size={20} /> },
    { name: "الصفوف والحلقات", icon: <BookOpen size={20} /> },
    { name: "التسميع اليومي", icon: <Mic size={20} /> },
    { name: "الغياب والتأخر", icon: <Clock size={20} /> },
    { name: "الاختبارات", icon: <FileText size={20} /> },
    { name: "التقارير", icon: <BarChart size={20} /> },
    { name: "الأرشفة", icon: <Archive size={20} /> },
    { name: "الإعدادات", icon: <Settings size={20} /> },
  ];

  // تم تحديث الرابط لصيغة lh3 لضمان استقرار التحميل من جوجل درايف
  const logoUrl = "https://lh3.googleusercontent.com/d/1d7iVX2-CJrnNDsW8C3QjIc3tMW_20DW6";

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-90 sm:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleSidebar}
      />

      <aside
        className={`fixed sm:static inset-y-0 right-0 z-100 h-screen shrink-0 transition-all duration-300 ease-in-out bg-primary text-white flex flex-col ${
          isOpen ? "w-64 translate-x-0" : "w-20 translate-x-full sm:translate-x-0"
        }`}
      >
        <div className={`flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative ${isOpen ? "py-8 px-4" : "py-4 px-2"}`}>
          {isOpen && (
            <button
              onClick={toggleSidebar}
              className="absolute top-4 left-4 p-1 rounded-md hover:bg-white/10 text-soft-secondary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div className={`flex flex-col items-center justify-center gap-3 w-full ${isOpen ? "mt-2" : ""}`}>
            {/* حاوية الشعار مع تحسينات العرض */}
            <div className={`flex items-center justify-center rounded-xl shrink-0 overflow-hidden transition-all duration-300 bg-white shadow-lg ${isOpen ? "w-24 h-24" : "w-10 h-10 hidden sm:flex"}`}>
              <img 
                src={logoUrl} 
                alt="شعار المعهد" 
                className="w-full h-full object-contain p-1" // إضافة p-1 ليكون الشعار مرتاحاً داخل المربع
                onLoad={() => console.log("تم تحميل الشعار بنجاح")}
                onError={(e: any) => {
                  console.error("فشل تحميل الشعار من الدرايف");
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              {/* بديل يظهر في حال فشل الصورة */}
              <span className="hidden font-bold text-primary">ج</span>
            </div>
            
            {isOpen && (
              <span className="font-bold text-base text-center whitespace-normal leading-tight px-2">
                نظام إدارة معهد جامع سليمان الأيوبي
              </span>
            )}
          </div>
        </div>

        {/* زر التصغير عند الإغلاق */}
        {!isOpen && (
          <button
            onClick={toggleSidebar}
            className="w-full py-3 justify-center hover:bg-white/10 text-soft-secondary transition-colors hidden sm:flex shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="py-4 overflow-y-auto flex-1">
          <ul className="space-y-1 px-3">
            {menuItems.map((item, index) => {
              const isActive = activeTab === item.name;
              return (
                <li key={index}>
                  <button
                    onClick={() => {
                      setActiveTab(item.name);
                      if (window.innerWidth < 640) {
                        toggleSidebar();
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-accent"
                    }`}
                    title={!isOpen ? item.name : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {isOpen && (
                      <span className="whitespace-nowrap">{item.name}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}