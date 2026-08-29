export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "PAUSED" | "CANCELLED";
export type RecurrenceRule = "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL" | "CUSTOM";

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  isSystem: boolean;
  sortOrder: number;
  _count?: {
    tasks?: number;
    projects?: number;
    courses?: number;
    books?: number;
    financialReminders?: number;
  };
}

export interface SubtaskData {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  categoryId?: string | null;
  category?: CategoryData | null;
  projectId?: string | null;
  project?: ProjectData | null;
  courseId?: string | null;
  course?: CourseData | null;
  bookId?: string | null;
  book?: BookData | null;
  financialReminderId?: string | null;
  financialReminder?: FinancialReminderData | null;
  startDate?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  completedAt?: string | null;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  recurrenceInterval?: number | null;
  tags?: string | null;
  notes?: string | null;
  attachments?: string | null;
  clientName?: string | null;
  clientValue?: number | null;
  academicSubject?: string | null;
  isInbox: boolean;
  sortOrder: number;
  subtasks?: SubtaskData[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD" | "ARCHIVED";
  priority: Priority;
  startDate?: string | null;
  dueDate?: string | null;
  progress: number;
  notes?: string | null;
  links?: string | null;
  categoryId?: string | null;
  category?: CategoryData | null;
  tasks?: TaskData[];
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface CourseData {
  id: string;
  name: string;
  institution?: string | null;
  totalModules: number;
  currentModule: number;
  progress: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  startDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  links?: string | null;
  categoryId?: string | null;
  category?: CategoryData | null;
  tasks?: TaskData[];
  _count?: { tasks: number };
  createdAt: string;
  updatedAt: string;
}

export interface BookData {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  coverUrl?: string | null;
  totalPages: number;
  currentPage: number;
  progress: number;
  status: "WANT_TO_READ" | "READING" | "COMPLETED" | "DROPPED";
  startDate?: string | null;
  finishDate?: string | null;
  rating?: number | null;
  notes?: string | null;
  categoryId?: string | null;
  category?: CategoryData | null;
  tasks?: TaskData[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReminderData {
  id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  type: "EXPENSE" | "INCOME";
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  isRecurring: boolean;
  recurrenceRule?: string | null;
  recurrenceDay?: number | null;
  recipient?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  category?: CategoryData | null;
  tasks?: TaskData[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsData {
  id: string;
  name: string;
  email: string;
  theme: "dark" | "light" | "system";
  autoConfirmAiActions: boolean;
  notificationsEnabled: boolean;
  geminiApiKey?: string | null;
}

export interface PendingAction {
  type: "CREATE_TASK" | "UPDATE_TASK" | "DELETE_TASK" | "CREATE_PROJECT" | "CREATE_COURSE" | "UPDATE_BOOK" | "REGISTER_FINANCE";
  title: string;
  summary: string;
  payload: Record<string, any>;
  confirmed?: boolean;
}

export interface ChatMessageData {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: string | null;
  toolResults?: string | null;
  pendingAction?: PendingAction | null;
  createdAt: string;
}
