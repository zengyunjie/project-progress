export default function Footer(_props: { sidebarCollapsed?: boolean }) {
  return (
    <footer className="h-12 border-t border-[#E2E8F0] bg-white flex items-center justify-center">
      <p className="text-xs text-[#94A3B8]">
        项目进度管理系统
        <span className="ml-2 font-mono text-[#CBD5E1]">v2.0</span>
        <span className="mx-2 text-[#E2E8F0]">|</span>
        <span className="text-[#CBD5E1]">Powered by Supabase</span>
      </p>
    </footer>
  );
}
