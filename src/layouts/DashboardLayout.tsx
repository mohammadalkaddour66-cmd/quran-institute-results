import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dashboardSection?: string;
  setDashboardSection?: (section: string) => void;
  onLogout?: () => void;
}

export default function DashboardLayout({ children, activeTab, setActiveTab, dashboardSection, setDashboardSection, onLogout }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar 
          toggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          dashboardSection={dashboardSection}
          setDashboardSection={setDashboardSection}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
