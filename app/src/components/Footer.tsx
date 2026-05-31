export default function Footer(_props: { sidebarCollapsed?: boolean }) {
  return (
    <footer className="h-10 sm:h-12 border-t border-[#E2E8F0] bg-white flex items-center justify-center px-3">
      <p className="text-[0.625rem] sm:text-xs text-[#94A3B8] text-center">
        <span className="hidden sm:inline">项目进度管理系统</span>
        <span className="sm:hidden">项目进度</span>
        <span className="ml-2 font-mono text-[#CBD5E1]">v2.0</span>
        <span className="mx-2 text-[#E2E8F0]">|</span>
        <span className="text-[#CBD5E1] hidden sm:inline">Powered by Supabase</span>
        <span className="text-[#CBD5E1] sm:hidden">Supabase</span>
      </p>
    </footer>
  );
}
