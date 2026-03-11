import React, { useEffect, useState } from "react";
import { Menu, Bell, User, ChevronDown } from "lucide-react";

interface TopbarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  dashboardSection?: string;
  setDashboardSection?: (section: string) => void;
  onLogout?: () => void;
}

export default function Topbar({ 
  toggleSidebar, 
  isSidebarOpen, 
  activeTab, 
  setActiveTab, 
  dashboardSection,
  setDashboardSection,
  onLogout 
}: TopbarProps) {
  const currentDashboardTab = dashboardSection || "الرئيسية";

  const navItems = [
    { label: "الرئيسية" },
    { label: "الطلاب" },
    { label: "الحلقات" },
    { label: "المدرسين" },
    { label: "الاختبارات" },
  ];

  const handleNavClick = (label: string) => {
    if (setActiveTab) setActiveTab("لوحة التحكم");
    if (setDashboardSection) {
      setDashboardSection(label);
    } else {
      window.dispatchEvent(new CustomEvent("dashboard-tab-change", { detail: label }));
    }
  };

  return (
    <header className="bg-white border-b border-soft-secondary h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-background text-primary sm:hidden"
        >
          <Menu size={24} />
        </button>
      
      </div>

      {/* Horizontal Navigation Menu (Desktop) */}
      <nav className="hidden md:flex items-center gap-2 mx-4 flex-1 justify-center">
        {navItems.map((item) => {
          const isActive = activeTab === "لوحة التحكم" && currentDashboardTab === item.label;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.label)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-neutral-text hover:bg-soft-secondary/20 hover:text-primary"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Dropdown Navigation Menu (Mobile/Tablet) */}
      <div className="md:hidden flex-1 flex justify-center mx-2">
        <div className="relative w-full max-w-[200px]">
          <select
            value={currentDashboardTab}
            onChange={(e) => handleNavClick(e.target.value)}
            className="w-full appearance-none bg-[#F2F2F2] border border-soft-secondary/50 text-primary font-semibold py-2 px-4 pr-8 rounded-lg focus:outline-none focus:border-accent"
          >
            {navItems.map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-primary">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('force-refresh'))}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-accent border border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
          title="تحديث البيانات"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span className="hidden sm:inline">تحديث</span>
        </button>

        <button className="p-2 rounded-full hover:bg-background text-neutral-text relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 border-r border-soft-secondary/50 pr-4">
          <button 
            onClick={() => handleNavClick("الإعدادات")}
            className="text-left hidden sm:block hover:opacity-80 transition-opacity text-right"
          >
            <p className="text-sm font-semibold text-primary">محمد القدور</p>
            <p className="text-xs text-neutral-text">مدير النظام</p>
          </button>
          <div 
            className="w-10 h-10 rounded-full bg-soft-secondary flex items-center justify-center text-primary cursor-pointer hover:bg-soft-secondary/80 transition-colors" 
            onClick={() => handleNavClick("الإعدادات")} 
            title="الملف الشخصي"
          >
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
