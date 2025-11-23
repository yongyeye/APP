
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative pl-6 pb-24">
      
      <!-- Main Vertical Bus Trace (The Power Rail) -->
      <div class="absolute left-3 top-0 bottom-0 w-1 silver-trace rounded-full z-0 opacity-80"></div>

      @for (task of tasks(); track task.id; let index = $index) {
        <div 
          class="relative flex items-center mb-6 group"
        >
          <!-- Organic Trace Connector (SVG) connecting Main Bus to Component -->
          <div class="absolute left-[-1.5rem] top-1/2 w-8 h-4 -translate-y-1/2 pointer-events-none z-0">
             <svg width="100%" height="100%" viewBox="0 0 32 16" preserveAspectRatio="none">
               <path d="M0,8 C10,8 10,8 32,8" fill="none" stroke="#d1d5db" stroke-width="2" vector-effect="non-scaling-stroke" />
               <circle cx="0" cy="8" r="3" fill="#9ca3af" />
             </svg>
          </div>

          <!-- Solder Pad (Checkbox) -->
          <button 
            (click)="onToggle(task.id)"
            class="relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all mr-3 flex-shrink-0"
            [class.bg-[#3f4a36]]="!task.completed"
            [class.bg-gray-300]="task.completed"
            [class.cursor-not-allowed]="readonly()"
            [disabled]="readonly()"
          >
            <!-- Solder Ring (Always Visible) -->
            <div class="absolute inset-0 rounded-full border-4 border-[#a3a3a3] shadow-inner"></div>
            
            <!-- Solder Blob (When Completed) -->
            @if (task.completed) {
              <div class="w-full h-full rounded-full bg-gradient-to-br from-white via-gray-300 to-gray-500 scale-75 shadow-lg transform transition-transform duration-300"></div>
            } @else {
               <!-- Empty darker hole -->
               <div class="w-full h-full rounded-full bg-[#1a1d16] scale-75 opacity-50 shadow-inner"></div>
            }
          </button>

          <!-- Component Body (Text) -->
          <div 
            class="flex-1 relative z-10 py-3 px-4 transition-all border border-transparent rounded"
            [class.hover:border-[#a3a3a3]/30]="!readonly()"
            [class.opacity-50]="task.completed"
          >
             <!-- Label Text -->
            <span 
              class="block font-tech text-sm tracking-wider uppercase transition-colors"
              [class.text-[#e2e8f0]]="!task.completed"
              [class.text-[#8e9684]]="task.completed"
              [class.line-through]="task.completed"
            >
              {{ task.title }}
            </span>
            
            <!-- Component decorations -->
            <div class="absolute -bottom-1 right-2 text-[8px] text-[#5d6b4f] font-mono">
               R{{index + 100}} • 10kΩ
            </div>
          </div>

          <!-- Delete Action (Desolder) - Only show if NOT readonly -->
          @if (!readonly()) {
            <button 
              (click)="onDelete(task.id)"
              class="opacity-0 group-hover:opacity-100 p-2 text-[#5d6b4f] hover:text-red-400 transition-colors z-20"
              title="Desolder Component"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        </div>
      } @empty {
        <div class="flex flex-col items-center justify-center py-10 ml-[-1rem] text-[#5d6b4f]">
          <div class="w-16 h-16 border-2 border-dashed border-[#5d6b4f] rounded-full flex items-center justify-center mb-2">
            <div class="w-2 h-2 bg-[#5d6b4f] rounded-full"></div>
          </div>
          <p class="text-xs font-tech uppercase tracking-widest">Circuit Open / No Components</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .silver-trace {
      background: linear-gradient(180deg, #d1d5db 0%, #9ca3af 100%);
      box-shadow: 2px 0 4px rgba(0,0,0,0.3);
    }
  `]
})
export class TaskListComponent {
  tasks = input.required<Task[]>();
  readonly = input<boolean>(false);
  toggle = output<string>();
  delete = output<string>();

  onToggle(id: string) {
    if (this.readonly()) return;
    this.toggle.emit(id);
  }

  onDelete(id: string) {
    if (this.readonly()) return;
    this.delete.emit(id);
  }
}
