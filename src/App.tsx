import React, { useState, useEffect } from "react";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import StudentRegistrationForm from "./pages/StudentRegistrationForm";
import StaffManagementForm from "./pages/StaffManagementForm";
import ClassesGroupsManagementForm from "./pages/ClassesGroupsManagementForm";
import DailyRecitationForm from "./pages/DailyRecitationForm";
import AttendanceTardinessForm from "./pages/AttendanceTardinessForm";
import TestsManagementForm from "./pages/TestsManagementForm";
import ReportsDashboard from "./pages/ReportsDashboard";
import ArchivingDashboard from "./pages/ArchivingDashboard";
import FlexibleSettingsForm from "./pages/FlexibleSettingsForm";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { processOfflineQueue } from "./utils/syncUtils";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");
  const [activeTab, setActiveTab] = useState("لوحة التحكم");
  const [dashboardSection, setDashboardSection] = useState("الطلاب");
  const [notification, setNotification] = useState<{message: string, type: 'info' | 'success'} | null>(null);

  useEffect(() => {
    // Mock session check
    setLoading(false);

    // Initial check for offline queue
    processOfflineQueue();

    const handleOfflineSave = (e: any) => {
      setNotification({ message: e.detail.message, type: 'info' });
      setTimeout(() => setNotification(null), 5000);
    };

    const handleSyncComplete = (e: any) => {
      setNotification({ message: e.detail.message, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    };

    window.addEventListener('offline-save', handleOfflineSave);
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('offline-save', handleOfflineSave);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  const handleLogout = async () => {
    if (isDemo) {
      setIsDemo(false);
    } else {
      setSession(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!session && !isDemo) {
    if (authView === "signup") {
      return (
        <SignUp 
          onSignUpSuccess={() => {}} 
          onNavigateToSignIn={() => setAuthView("signin")} 
        />
      );
    }
    return (
      <SignIn 
        onLoginSuccess={() => setIsDemo(true)} 
        onNavigateToSignUp={() => setAuthView("signup")} 
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "لوحة التحكم":
        return <Dashboard activeSection={dashboardSection} />;
      case "تسجيل الطلاب":
        return <StudentRegistrationForm />;
      case "تسجيل الكادر":
        return <StaffManagementForm />;
      case "الصفوف والحلقات":
        return <ClassesGroupsManagementForm />;
      case "التسميع اليومي":
        return <DailyRecitationForm />;
      case "الغياب والتأخر":
        return <AttendanceTardinessForm />;
      case "الاختبارات":
        return <TestsManagementForm />;
      case "التقارير":
        return <ReportsDashboard />;
      case "الأرشفة":
        return <ArchivingDashboard />;
      case "الإعدادات":
        return <FlexibleSettingsForm />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <h2 className="text-2xl text-neutral-text font-bold">{activeTab} - قريباً</h2>
          </div>
        );
    }
  }

  return (
    <>
      <DashboardLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        dashboardSection={dashboardSection}
        setDashboardSection={setDashboardSection}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>

      {/* Global Notification */}
      {notification && (
        <div className={`fixed bottom-8 left-8 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50 ${
          notification.type === 'success' ? 'bg-primary text-white' : 'bg-[#D9534F] text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="text-accent" size={24} />
          ) : (
            <AlertCircle className="text-white" size={24} />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}
    </>
  );
}
