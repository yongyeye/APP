
import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenAIService } from './services/genai.service';
import { PuzzleBoardComponent } from './components/puzzle-board.component';
import { TaskListComponent, Task } from './components/task-list.component';
import { PuzzleCollectionComponent, DailySession } from './components/puzzle-collection.component';

type ViewMode = 'game' | 'collection';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, PuzzleBoardComponent, TaskListComponent, PuzzleCollectionComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private genAI = inject(GenAIService);

  // --- STATE ---
  currentView = signal<ViewMode>('game');
  
  // The master list of all days
  sessions = signal<DailySession[]>([]);
  
  // Which day is currently loaded on the board?
  activeSessionId = signal<string | null>(null);

  // UI State
  newTaskTitle = signal('');
  isGenerating = signal(false);

  // --- COMPUTED HELPERS (Derived from the Active Session) ---
  
  activeSession = computed(() => 
    this.sessions().find(s => s.id === this.activeSessionId())
  );

  // The tasks specifically for the active day
  currentTasks = computed(() => 
    this.activeSession()?.tasks || []
  );

  // The image specifically for the active day
  currentPuzzleImage = computed(() => 
    this.activeSession()?.imageUrl || null
  );

  // Metrics for the active day
  completedTasksCount = computed(() => 
    this.currentTasks().filter((t: Task) => t.completed).length
  );

  // Check if all tasks are completed (for auto-solve capability)
  isAllTasksCompleted = computed(() => {
    const tasks = this.currentTasks();
    return tasks.length > 0 && tasks.every((t: Task) => t.completed);
  });
  
  // --- GLOBAL SYSTEM STATS ---
  totalOpsPerformed = computed(() => {
    return this.sessions().reduce((total, session) => {
      const completed = session.tasks ? session.tasks.filter((t: any) => t.completed).length : 0;
      return total + completed;
    }, 0);
  });

  // System Version increases by 0.01 for every task completed. Starts at v1.0.
  systemVersion = computed(() => {
    const base = 1.0;
    const upgrade = this.totalOpsPerformed() * 0.01;
    return (base + upgrade).toFixed(2);
  });
  
  // Themes - Updated for "Cute Voxel Animal" vibe
  themes = [
    'Shiba Inu Dog', 
    'Tabby Cat', 
    'Baby Penguin', 
    'Red Panda', 
    'Fennec Fox', 
    'Tiny Owl', 
    'Bunny Rabbit', 
    'Golden Hamster', 
    'Hedgehog', 
    'Koala Bear', 
    'Pink Axolotl', 
    'Capybara', 
    'River Otter',
    'Raccoon',
    'Baby Elephant',
    'Deer Fawn'
  ];

  constructor() {
    // Auto-save whenever sessions change
    effect(() => {
      const s = this.sessions();
      if (s.length > 0) {
        localStorage.setItem('puzzleSessions', JSON.stringify(s));
      }
    });
  }

  ngOnInit() {
    this.loadSessions();
    this.initializeToday();
  }

  loadSessions() {
    const stored = localStorage.getItem('puzzleSessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.sessions.set(parsed);
      } catch (e) {
        console.error('Failed to parse sessions', e);
      }
    }
  }

  /**
   * Checks if we have a session for today. If not, creates one.
   * If yes, sets it as active.
   */
  async initializeToday() {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const existingSession = this.sessions().find(s => s.dateStr === todayStr);

    if (existingSession) {
      this.activeSessionId.set(existingSession.id);
    } else {
      await this.createNewSession(todayStr);
    }
  }

  async onCreateNextDay() {
    if (this.isGenerating()) return;

    // determine the next date based on existing sessions
    const allDates = this.sessions().map(s => s.dateStr).sort();
    let nextDateStr = new Date().toISOString().split('T')[0];

    if (allDates.length > 0) {
      const lastDateStr = allDates[allDates.length - 1];
      const nextDate = new Date(lastDateStr);
      // Add one day
      nextDate.setDate(nextDate.getDate() + 1);
      nextDateStr = nextDate.toISOString().split('T')[0];
    }

    await this.createNewSession(nextDateStr);
    // Switch view back to game to see the new day
    this.currentView.set('game');
  }

  async createNewSession(dateStr: string) {
    if (this.isGenerating()) return;
    this.isGenerating.set(true);

    const randomTheme = this.themes[Math.floor(Math.random() * this.themes.length)];
    // Random grid size: 3, 4, or 5
    const gridSize = Math.floor(Math.random() * 3) + 3;
    
    let imageUrl = 'https://picsum.photos/800/800?grayscale'; // Fallback

    try {
      // Updated prompt for Voxel/Pixel Art Animals
      imageUrl = await this.genAI.generatePuzzleImage(`Cute ${randomTheme} character, isometric 3d voxel art style, digital pet aesthetic, colorful, clean dark gradient background, 8-bit inspired, high fidelity render`);
    } catch (e) {
      console.error('GenAI failed, using fallback', e);
    }

    const newSession: DailySession = {
      id: crypto.randomUUID(),
      dateStr: dateStr,
      imageUrl: imageUrl,
      theme: randomTheme,
      gridSize: gridSize, // Set the random grid size
      tasks: [
        { id: '1', title: 'Initialize System', completed: false },
        { id: '2', title: 'Review Directives', completed: false },
        { id: '3', title: 'Charge Battery', completed: false }
      ],
      isSealed: false
    };

    // Add to top of list
    this.sessions.update(current => [newSession, ...current]);
    this.activeSessionId.set(newSession.id);
    this.isGenerating.set(false);
  }

  // --- ACTIONS (Apply to ACTIVE session) ---

  /**
   * Called when user clicks a session in the Collection view
   */
  selectSession(id: string) {
    this.activeSessionId.set(id);
    this.currentView.set('game'); // Auto switch back to board to see the selected day
  }

  addTask() {
    const title = this.newTaskTitle().trim();
    if (!title || !this.activeSessionId()) return;

    this.updateActiveSessionTasks(tasks => [
      ...tasks,
      { id: crypto.randomUUID(), title, completed: false }
    ]);
    this.newTaskTitle.set('');
  }

  toggleTask(id: string) {
    this.updateActiveSessionTasks(tasks => 
      tasks.map((t: Task) => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  deleteTask(id: string) {
    this.updateActiveSessionTasks(tasks => 
      tasks.filter((t: Task) => t.id !== id)
    );
  }

  async suggestTasks() {
    if (this.isGenerating() || !this.activeSessionId()) return;
    this.isGenerating.set(true);
    try {
      const suggestions = await this.genAI.suggestTasks();
      const newTasks = suggestions.map(s => ({
        id: crypto.randomUUID(),
        title: s.title,
        completed: false
      }));
      this.updateActiveSessionTasks(current => [...current, ...newTasks]);
    } catch (e) {
      console.error('Failed to suggest tasks', e);
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Helper to update tasks immutably for the active session only
   */
  private updateActiveSessionTasks(updater: (currentTasks: Task[]) => Task[]) {
    const activeId = this.activeSessionId();
    if (!activeId) return;

    this.sessions.update(allSessions => 
      allSessions.map(session => {
        if (session.id === activeId) {
          return { ...session, tasks: updater(session.tasks) };
        }
        return session;
      })
    );
  }

  // "Sealing" the day (triggered by PuzzleBoard archive button)
  sealSession() {
    const activeId = this.activeSessionId();
    if (!activeId) return;

    this.sessions.update(all => all.map(s => 
      s.id === activeId ? { ...s, isSealed: true } : s
    ));
    
    // Switch to collection to admire the work
    this.currentView.set('collection');
  }

  // Manual regenerate for the CURRENT day (if user hates the image)
  async regenerateCurrentPuzzle() {
    if (this.isGenerating() || !this.activeSessionId()) return;
    this.isGenerating.set(true);
    
    try {
      const randomTheme = this.themes[Math.floor(Math.random() * this.themes.length)];
      // Prompt updated here as well
      const img = await this.genAI.generatePuzzleImage(`Cute ${randomTheme} character, isometric 3d voxel art style, digital pet aesthetic, colorful, clean dark gradient background, 8-bit inspired, high fidelity render`);
      
      this.sessions.update(all => all.map(s => 
        s.id === this.activeSessionId() 
          ? { ...s, imageUrl: img, theme: randomTheme } 
          : s
      ));
    } catch (e) {
      console.error(e);
    } finally {
      this.isGenerating.set(false);
    }
  }

  switchView(view: ViewMode) {
    this.currentView.set(view);
  }
}
