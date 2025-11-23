
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Define the structure of a Day's Session
export interface DailySession {
  id: string;
  dateStr: string; // YYYY-MM-DD
  imageUrl: string;
  theme: string;
  tasks: any[]; 
  isSealed: boolean; 
  gridSize?: number; // Optional, defaults to 3 if undefined
}

@Component({
  selector: 'app-puzzle-collection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 gap-4 pb-24">
      
      <!-- Create New Button -->
      <button 
        (click)="onCreate()"
        class="min-h-[160px] flex flex-col items-center justify-center gap-2 bg-[#3f4a36]/10 border-2 border-dashed border-[#5d6b4f] rounded hover:bg-[#3f4a36]/20 transition-all group active:scale-95"
      >
        <div class="w-10 h-10 rounded-full bg-[#1a1d16] border border-[#5d6b4f] flex items-center justify-center group-hover:scale-110 transition-transform text-[#e2e8f0] shadow-lg">
           <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </div>
        <span class="text-[10px] font-tech font-bold text-[#8e9684] uppercase tracking-widest group-hover:text-[#e2e8f0] transition-colors">INITIALIZE NEW DAY</span>
      </button>

      @for (session of sessions(); track session.id) {
        <button 
          (click)="onSelect(session.id)"
          class="text-left bg-[#3f4a36]/30 p-2 rounded border shadow-lg flex flex-col group relative overflow-hidden backdrop-blur-sm transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#8e9684]"
          [class.border-[#5d6b4f]]="activeId() !== session.id"
          [class.border-[#e2e8f0]]="activeId() === session.id"
          [class.ring-1]="activeId() === session.id"
        >
          
          <!-- Image Frame -->
          <div class="aspect-square bg-[#1a1d16] mb-2 relative border border-[#5d6b4f]/50 overflow-hidden w-full group-hover:border-[#8e9684] transition-colors">
            
            @if (isRevealed(session)) {
              <img [src]="session.imageUrl" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 filter contrast-125" loading="lazy" />
              <!-- Scanline overlay -->
              <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-50"></div>
            } @else {
              <!-- Locked / Encrypted Placeholder -->
              <div class="absolute inset-0 flex flex-col items-center justify-center bg-[#0f110d] p-4 text-center">
                 <svg class="w-8 h-8 text-[#5d6b4f] mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                 </svg>
                 <span class="text-[8px] font-tech text-[#5d6b4f] uppercase tracking-widest animate-pulse">
                    DATA LOCKED
                 </span>
                 <div class="w-full h-1 bg-[#1a1d16] mt-2 rounded overflow-hidden border border-[#3f4a36]">
                    <div class="h-full bg-[#5d6b4f]" [style.width.%]="getProgress(session)"></div>
                 </div>
              </div>
            }

            <!-- Active Indicator -->
            @if (activeId() === session.id) {
              <div class="absolute top-1 left-1 bg-green-500 text-[#1a1d16] text-[8px] font-bold px-1 rounded animate-pulse">ACTIVE</div>
            }
          </div>

          <!-- Label -->
          <div class="px-1 w-full">
            <div class="flex justify-between items-baseline">
              <p class="text-[10px] font-tech font-bold text-[#d1d5db] truncate uppercase tracking-wider flex-1">
                {{ isRevealed(session) ? session.theme : 'ENCRYPTED LOG' }}
              </p>
            </div>
            <p class="text-[8px] text-[#8e9684] font-mono mt-0.5 flex justify-between">
              <span>{{ session.dateStr }}</span>
              <span>{{ getCompletedCount(session) }}/{{ session.tasks.length }} OPS</span>
            </p>
            <!-- Grid Size Badge -->
            <p class="text-[8px] text-[#5d6b4f] font-mono mt-1 text-right">
              GRID_MTX: {{ session.gridSize || 3 }}x{{ session.gridSize || 3 }}
            </p>
          </div>
          
          <!-- Silver screw heads in corners -->
          <div class="absolute top-1 right-1 w-1 h-1 rounded-full bg-gray-400"></div>

        </button>
      }
    </div>
  `
})
export class PuzzleCollectionComponent {
  sessions = input.required<DailySession[]>();
  activeId = input<string | null>(null);
  sessionSelected = output<string>();
  createSession = output<void>();

  onSelect(id: string) {
    this.sessionSelected.emit(id);
  }

  onCreate() {
    this.createSession.emit();
  }

  isRevealed(session: DailySession): boolean {
    // Only show the full image if it's explicitly archived (sealed) OR all tasks are completed.
    return session.isSealed || (session.tasks && session.tasks.length > 0 && session.tasks.every((t: any) => t.completed));
  }

  getProgress(session: DailySession): number {
    if (!session.tasks || session.tasks.length === 0) return 0;
    const completed = session.tasks.filter((t: any) => t.completed).length;
    return (completed / session.tasks.length) * 100;
  }

  getCompletedCount(session: DailySession): number {
    return session.tasks ? session.tasks.filter((t: any) => t.completed).length : 0;
  }
}
