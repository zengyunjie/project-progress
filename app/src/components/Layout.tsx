import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
  dailyDigestEnabled: boolean;
  onToggleDigest: () => void;
  onNewTask: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

export default function Layout({ children, dailyDigestEnabled, onToggleDigest, onNewTask, onExport, onImport }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC]">
      <Navbar
        dailyDigestEnabled={dailyDigestEnabled}
        onToggleDigest={onToggleDigest}
        onNewTask={onNewTask}
        onExport={onExport}
        onImport={onImport}
      />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
