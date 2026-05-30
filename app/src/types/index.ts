export interface Attachment {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

export interface ProgressEntry {
  id: string;
  taskId: string;
  timestamp: string;
  progress: number;
  note: string;
}

export type TaskCategory = string;

export interface Task {
  id: string;
  name: string;
  category: TaskCategory;
  createdDate: string;
  deadline: string;
  progress: number;
  status: "active" | "completed" | "overdue" | "terminated";
  history: ProgressEntry[];
  attachments?: Attachment[];
  sort_order: number;
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: "new-product", name: "新产品开发", color: "#14B8A6" },
  { id: "daily-order", name: "日常订单跟进", color: "#3B82F6" },
  { id: "temporary", name: "临时项目", color: "#F59E0B" },
];

export type FilterType = "all" | "in-progress" | "completed" | "overdue";
