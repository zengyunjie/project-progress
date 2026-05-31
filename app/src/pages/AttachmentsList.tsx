import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, ChevronRight, ChevronDown, Search, Download, Eye, X, Paperclip,
} from "lucide-react";
import { useTaskManager } from "@/hooks/useTaskManager";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function isImage(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/");
}

function isPDF(dataUrl: string): boolean {
  return dataUrl.startsWith("data:application/pdf");
}

export default function AttachmentsList() {
  const { tasks } = useTaskManager();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; dataUrl: string } | null>(null);

  // Group tasks that have attachments
  const projectGroups = useMemo(() => {
    const withAtts = tasks.filter((t) => t.attachments && t.attachments.length > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      return withAtts.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.attachments?.some((a) => a.name.toLowerCase().includes(q))
      );
    }
    return withAtts;
  }, [tasks, search]);

  const totalAttachments = useMemo(
    () => projectGroups.reduce((sum, t) => sum + (t.attachments?.length || 0), 0),
    [projectGroups]
  );

  const toggleProject = (taskId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedProjects.size === projectGroups.length && projectGroups.length > 0) {
      setExpandedProjects(new Set());
    } else {
      setExpandedProjects(new Set(projectGroups.map((t) => t.id)));
    }
  };

  return (
    <Layout dailyDigestEnabled={false} onNewTask={() => {}}>
      <div className="max-w-[1280px] mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-[1.25rem] sm:text-[1.5rem] font-bold text-[#1E293B]">项目附件清单</h1>
              <p className="text-xs text-[#94A3B8]">
                {projectGroups.length} 个项目 · <span className="tabular-nums">{totalAttachments}</span> 个附件
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="relative flex-1 md:max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索项目名称或附件名称..."
              className="h-10 pl-10 pr-4 rounded-lg bg-[#F1F5F9] border-0 text-sm text-[#64748B] placeholder:text-[#94A3B8] focus:bg-white focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all" />
          </div>
          <button onClick={expandAll}
            className="shrink-0 h-10 px-4 bg-[#F1F5F9] rounded-lg text-sm text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#334155] transition-all cursor-pointer">
            {expandedProjects.size === projectGroups.length && projectGroups.length > 0 ? "全部折叠" : "全部展开"}
          </button>
        </motion.div>

        {/* Project Groups */}
        {projectGroups.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20">
            <Paperclip className="w-16 h-16 text-[#CBD5E1] mb-4" />
            <p className="text-lg font-semibold text-[#64748B]">
              {search ? "没有匹配的附件" : "暂无附件"}
            </p>
            <p className="text-sm text-[#94A3B8] mt-1">
              {search ? "试试调整搜索条件" : "在任务编辑中上传文件后，将在此处显示"}
            </p>
            {search && (
              <button onClick={() => setSearch("")}
                className="mt-3 text-sm font-medium text-[#3B82F6] hover:underline cursor-pointer">
                清除搜索
              </button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {projectGroups.map((task, index) => {
                const isExpanded = expandedProjects.has(task.id);
                const attCount = task.attachments?.length || 0;
                return (
                  <motion.div key={task.id} layout
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: index * 0.06 }}
                    className="bg-white border border-[#E2E8F0] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {/* Project Header */}
                    <button onClick={() => toggleProject(task.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer text-left">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4 text-[#3B82F6]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#334155] truncate">{task.name}</p>
                      </div>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#3B82F6]">
                        {attCount} 个附件
                      </span>
                    </button>

                    {/* Attachment List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="px-5 pb-4 border-t border-[#E2E8F0] pt-3">
                            <div className="flex flex-col gap-1.5">
                              {task.attachments?.map((att, attIdx) => (
                                <div key={att.id}
                                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all group">
                                  <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                                  <span className="flex-1 text-sm text-[#475569] truncate font-medium">{att.name}</span>
                                  <span className="text-xs font-mono text-[#94A3B8] shrink-0 tabular-nums">{formatFileSize(att.size)}</span>
                                  <button onClick={(e) => { e.stopPropagation(); setPreviewAttachment({ name: att.name, dataUrl: att.dataUrl }); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#3B82F6] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all cursor-pointer shrink-0"
                                    title="预览">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a href={att.dataUrl} download={att.name}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-7 h-7 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#64748B] hover:bg-[#E2E8F0] transition-all cursor-pointer shrink-0"
                                    title="下载">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-[800px] w-[90vw] max-h-[85vh] p-0 bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] border-0 gap-0 overflow-hidden">
          {previewAttachment && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                  <span className="text-sm font-semibold text-[#1E293B] truncate">{previewAttachment.name}</span>
                </div>
                <button onClick={() => setPreviewAttachment(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[#F8FAFC] flex items-center justify-center min-h-[300px]">
                {isImage(previewAttachment.dataUrl) ? (
                  <img src={previewAttachment.dataUrl} alt={previewAttachment.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
                ) : isPDF(previewAttachment.dataUrl) ? (
                  <iframe src={previewAttachment.dataUrl}
                    className="w-full h-[60vh] rounded-lg border border-[#E2E8F0]" title={previewAttachment.name} />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <FileText className="w-16 h-16 text-[#CBD5E1]" />
                    <p className="text-sm text-[#64748B]">无法预览此文件类型</p>
                    <a href={previewAttachment.dataUrl} download={previewAttachment.name}
                      className="text-sm font-medium text-[#3B82F6] hover:underline cursor-pointer">
                      点击下载
                    </a>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0]">
                <a href={previewAttachment.dataUrl} download={previewAttachment.name}
                  className="px-4 py-2 bg-[#3B82F6] text-white text-sm font-medium rounded-lg hover:bg-[#2563EB] transition-colors cursor-pointer">
                  下载文件
                </a>
                <button onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] text-sm font-medium rounded-lg hover:bg-[#E2E8F0] transition-colors cursor-pointer">
                  关闭
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
