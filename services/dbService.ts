import { Todo, Transaction, Note, PlanEvent, Goal } from '../types';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

class RemoteDatabase {
  
  private getUserId(): string {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id.toString();
    }
    console.warn("Using dev User ID. In production, open via Telegram.");
    return '123456789'; 
  }

  private async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
    const userId = this.getUserId();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-user-id': userId
    };

    const fullUrl = `${API_URL}/api${endpoint}`;

    try {
      const res = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok) {
         throw new Error(`API Error ${res.status}: ${res.statusText}`);
      }

      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      } else {
        const text = await res.text();
        console.error(`Expected JSON from ${fullUrl} but got:`, text.substring(0, 200));
        throw new Error("Server returned non-JSON response.");
      }
      
    } catch (e) {
      console.error(`Request failed: ${endpoint}`, e);
      if (method === 'GET') return [] as any;
      throw e;
    }
  }

  // --- TODOS ---
  async getTodos(): Promise<Todo[]> {
    const data = await this.request<{ todos: Todo[] }>('/sync');
    return data.todos || [];
  }
  async addTodo(todo: Omit<Todo, 'id' | 'createdAt'>): Promise<Todo> {
    return this.request<Todo>('/todos', 'POST', todo);
  }
  async toggleTodo(id: string): Promise<void> {
    await this.request(`/todos/${id}`, 'PATCH');
  }
  async deleteTodo(id: string): Promise<void> {
    await this.request(`/todos/${id}`, 'DELETE');
  }

  // --- BUDGET ---
  async getTransactions(): Promise<Transaction[]> {
    const data = await this.request<{ transactions: Transaction[] }>('/sync');
    return data.transactions || [];
  }
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', 'POST', tx);
  }
  async deleteTransaction(id: string): Promise<void> {
    await this.request(`/transactions/${id}`, 'DELETE');
  }

  // --- NOTES ---
  async getNotes(): Promise<Note[]> {
    const data = await this.request<{ notes: Note[] }>('/sync');
    return data.notes || [];
  }
  async addNote(content: string): Promise<Note> {
    return this.request<Note>('/notes', 'POST', { content });
  }
  async updateNote(id: string, content: string): Promise<void> {
    await this.request(`/notes/${id}`, 'PATCH', { content });
  }
  async deleteNote(id: string): Promise<void> {
    await this.request(`/notes/${id}`, 'DELETE');
  }

  // --- PLANNER ---
  async getEvents(): Promise<PlanEvent[]> {
    const data = await this.request<{ events: PlanEvent[] }>('/sync');
    const events = data.events || [];
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  async addEvent(event: Omit<PlanEvent, 'id' | 'completed'>): Promise<PlanEvent> {
    return this.request<PlanEvent>('/events', 'POST', event);
  }
  async deleteEvent(id: string): Promise<void> {
    await this.request(`/events/${id}`, 'DELETE');
  }

  // --- GOALS ---
  async getGoals(): Promise<Goal[]> {
    const data = await this.request<{ goals: Goal[] }>('/sync');
    return data.goals || [];
  }
  async addGoal(title: string): Promise<Goal> {
    return this.request<Goal>('/goals', 'POST', { title });
  }
  async toggleGoal(id: string): Promise<void> {
    await this.request(`/goals/${id}`, 'PATCH');
  }
  async deleteGoal(id: string): Promise<void> {
    await this.request(`/goals/${id}`, 'DELETE');
  }
}

export const db = new RemoteDatabase();