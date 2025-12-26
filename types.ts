export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO string
  type: 'expense' | 'income';
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export interface PlanEvent {
  id: string;
  title: string;
  date: string; // ISO string with time
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  completed: boolean;
}

export type ViewState = 'dashboard' | 'todos' | 'budget' | 'notes' | 'planner' | 'goals';

export interface QuickCommandResult {
  action: 'create_task' | 'create_transaction' | 'create_event' | 'create_note' | 'unknown';
  data: any;
  responseMessage: string;
}
