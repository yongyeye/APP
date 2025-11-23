
import { Component, input, computed, signal, effect, ElementRef, viewChild, output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PuzzlePiece {
  id: number;
  correctRow: number;
  correctCol: number;
  currentX: number; // percentage 0-100
  currentY: number; // percentage 0-100
  isLocked: boolean;
  isScattered: boolean; // True if unlocked but not placed
  isUnlocked: boolean; // True if task completed
  zIndex: number;
}

@Component({
  selector: 'app-puzzle-board',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main PCB Board Area -->
    <div class="relative p-6 rounded-lg transition-all duration-1000 overflow-hidden"
         [class.bg-[#3a4530]/40]="!isComplete()"
         [class.bg-[#3a4530]]="isComplete()"
         [class.border-2]="true"
         [class.border-[#5d6b4f]]="!isComplete()"
         [class.border-[#8e9684]]="isComplete()"
         [class.shadow-2xl]="true"
         [class.shadow-[0_0_50px_rgba(93,107,79,0.5)]]="isComplete()"
    >
      
      <!-- Decorative Silver Traces (SVG Background) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 400 400" preserveAspectRatio="none">
        <path d="M-10,50 Q100,50 150,100 T300,300" fill="none" [attr.stroke]="isComplete() ? '#fff' : '#a3a3a3'" stroke-width="2" class="transition-colors duration-1000" />
        <path d="M410,350 Q300,350 250,300 T100,100" fill="none" [attr.stroke]="isComplete() ? '#fff' : '#a3a3a3'" stroke-width="2" class="transition-colors duration-1000" />
        <circle cx="150" cy="100" r="4" [attr.fill]="isComplete() ? '#fff' : '#a3a3a3'" />
        <circle cx="250" cy="300" r="4" [attr.fill]="isComplete() ? '#fff' : '#a3a3a3'" />
      </svg>

      <!-- The Chip Socket (Puzzle Container) -->
      <div class="relative w-full aspect-square bg-[#1a1d16] border-2 border-[#8e9684] rounded-sm shadow-inner select-none touch-none overflow-hidden" #boardContainer>
        
        <!-- Corner Screw Mounts -->
        <div class="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 border border-gray-700 z-20"></div>
        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 border border-gray-700 z-20"></div>
        <div class="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 border border-gray-700 z-20"></div>
        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 border border-gray-700 z-20"></div>

        <!-- Placeholder / Loading State -->
        @if (!imageUrl()) {
          <div class="absolute inset-0 flex items-center justify-center text-[#5d6b4f]">
            <div class="text-center p-4">
              <p class="text-xs font-tech tracking-widest uppercase mb-4 opacity-70">INITIALIZING VISUAL MATRIX...</p>
              <!-- Tech Spinner -->
              <div class="w-10 h-10 border-2 border-[#5d6b4f] border-t-[#a3a3a3] rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        }

        <!-- Grid Guide (Background Slots) - Hidden when complete -->
        @if (!isComplete()) {
          <div 
             class="absolute inset-0 grid opacity-30 pointer-events-none transition-opacity duration-500"
             [style.grid-template-columns]="'repeat(' + gridSize() + ', 1fr)'"
             [style.grid-template-rows]="'repeat(' + gridSize() + ', 1fr)'"
          >
            @for (i of emptyGrid(); track i) {
              <div class="border border-[#3f4a36] bg-[#2a3024]">
                <!-- Little center dot for alignment -->
                <div class="w-1 h-1 bg-[#5d6b4f] rounded-full m-auto mt-[45%] opacity-50"></div>
              </div>
            }
          </div>
        }

        <!-- The Puzzle Pieces -->
        @if (imageUrl()) {
          <!-- If Complete or ReadOnly: Show Full Image to remove grid lines -->
          @if (isComplete()) {
            <div class="absolute inset-0 w-full h-full z-10 animate-fade-in">
               <img [src]="imageUrl()" class="w-full h-full object-cover" />
               <!-- Shiny Overlay -->
               <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-30 pointer-events-none"></div>
            </div>
          } @else {
             <!-- Active Pieces -->
            @for (piece of pieces(); track piece.id) {
              @if (piece.isUnlocked) {
                <div 
                  class="absolute cursor-grab active:cursor-grabbing p-[1px]"
                  [class.z-50]="!piece.isLocked && draggingPieceId() === piece.id"
                  [class.z-10]="!piece.isLocked && draggingPieceId() !== piece.id"
                  [class.z-0]="piece.isLocked"
                  [class.transition-all]="!draggingPieceId()" 
                  [class.duration-500]="!draggingPieceId()"
                  [style.width.%]="pieceSizePct()"
                  [style.height.%]="pieceSizePct()"
                  [style.left.%]="piece.currentX"
                  [style.top.%]="piece.currentY"
                  [style.z-index]="piece.zIndex"
                  (mousedown)="startDrag($event, piece)"
                  (touchstart)="startDrag($event, piece)"
                >
                  <!-- The Image Slice -->
                  <div 
                    class="w-full h-full box-border bg-[#0f110d]"
                    [class.shadow-xl]="!piece.isLocked"
                    [class.border]="!piece.isLocked"
                    [class.border-white/20]="!piece.isLocked"
                    [style.background-image]="'url(' + imageUrl() + ')'"
                    [style.background-size]="(gridSize() * 100) + '% ' + (gridSize() * 100) + '%'"
                    [style.background-position]="getBgPosition(piece.correctCol, piece.correctRow)"
                  >
                    @if (!piece.isLocked) {
                       <!-- Glass/Epoxy edge effect when floating -->
                       <div class="absolute inset-0 bg-[#5d6b4f]/10 mix-blend-overlay"></div>
                    }
                  </div>
                </div>
              }
            }
          }
        }
      </div>
      
      <!-- PCB Label -->
      <div class="absolute bottom-2 right-4 text-[8px] font-tech text-[#8e9684] opacity-50 rotate-0">
        MOD-{{gridSize()}}X{{gridSize()}} REV.B
      </div>

      <!-- Completion Action Bar -->
      <!-- Show Archive button ONLY if complete AND NOT yet archived (readonly) -->
      @if (isComplete() && !readonly()) {
        <div class="absolute bottom-6 left-0 right-0 flex justify-center z-[100] animate-bounce-in">
          <button 
            (click)="onArchive()"
            class="bg-[#e2e8f0] text-[#1a1d16] font-tech font-bold text-sm px-6 py-2 rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-white hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
          >
            <span>UPLOAD TO ARCHIVE</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </button>
        </div>
        
        <!-- Success Text Overlay -->
        <div class="absolute top-8 left-0 right-0 text-center pointer-events-none z-20">
             <div class="inline-block bg-[#1a1d16]/80 backdrop-blur border border-[#a3a3a3] px-4 py-1 rounded shadow-lg">
                <span class="text-green-400 font-tech tracking-widest text-xs animate-pulse">SYSTEM RESTORED</span>
             </div>
        </div>
      }

      <!-- Readonly Archive Status -->
      @if (readonly()) {
        <div class="absolute bottom-6 left-0 right-0 flex justify-center z-[100]">
          <div class="bg-[#1a1d16]/80 text-[#8e9684] font-tech text-xs px-4 py-1 rounded border border-[#5d6b4f] flex items-center gap-2">
             <span class="w-2 h-2 bg-green-500 rounded-full"></span>
             <span>ARCHIVED RECORD</span>
          </div>
        </div>
      }

      <!-- Auto Assemble Button -->
      <!-- Only show if: Not complete, enough pieces unlocked, all todos done, AND NOT readonly -->
      @if (!isComplete() && completedCount() >= totalPieces() && allTasksCompleted() && !readonly()) {
        <div class="absolute bottom-6 left-0 right-0 flex justify-center z-[100] animate-bounce-in">
          <button 
            (click)="autoAssemble()"
            class="bg-amber-500/90 text-[#1a1d16] font-tech font-bold text-sm px-6 py-2 rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] border-2 border-amber-300 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
          >
            <span>AUTO_ALIGN()</span>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
    .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes bounceIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
  `]
})
export class PuzzleBoardComponent {
  imageUrl = input<string | null>(null);
  completedCount = input.required<number>();
  allTasksCompleted = input<boolean>(false);
  readonly = input<boolean>(false);
  
  // New input to support variable grid sizes
  gridSize = input<number>(3); 

  puzzleCompleted = output<void>();
  boardContainer = viewChild<ElementRef>('boardContainer');

  draggingPieceId = signal<number | null>(null);
  pieces = signal<PuzzlePiece[]>([]);

  // Computed Helpers
  totalPieces = computed(() => this.gridSize() * this.gridSize());
  
  pieceSizePct = computed(() => 100 / this.gridSize());
  
  emptyGrid = computed(() => {
    return Array(this.totalPieces()).fill(0).map((_, i) => i);
  });

  isComplete = computed(() => {
    // If it's readonly (archived), we consider it visually complete immediately
    return this.readonly() || (this.pieces().length > 0 && this.pieces().every(p => p.isLocked));
  });

  constructor() {
    // When gridSize changes, regenerate pieces
    effect(() => {
      const g = this.gridSize();
      this.pieces.set(this.createInitialPieces(g));
    }, { allowSignalWrites: true });

    // When completed count changes, unlock more pieces
    effect(() => {
      const count = this.completedCount();
      if (!this.readonly()) {
        this.unlockPieces(count);
      }
    }, { allowSignalWrites: true });
  }

  private createInitialPieces(gridSize: number): PuzzlePiece[] {
    const arr: PuzzlePiece[] = [];
    let id = 0;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        arr.push({
          id: id++,
          correctRow: row,
          correctCol: col,
          currentX: 0,
          currentY: 0,
          isLocked: false,
          isScattered: false,
          isUnlocked: false,
          zIndex: 1
        });
      }
    }
    return arr;
  }

  getBgPosition(col: number, row: number): string {
    const size = this.gridSize();
    // For a 3x3 grid: positions are 0%, 50%, 100%
    // Formula: (index / (total - 1)) * 100
    // However, if size is 1, avoid division by zero
    if (size <= 1) return '0% 0%';
    
    const x = (col / (size - 1)) * 100;
    const y = (row / (size - 1)) * 100;
    return `${x}% ${y}%`;
  }

  private unlockPieces(count: number) {
    this.pieces.update(current => {
      const targetUnlocked = Math.min(count, this.totalPieces());
      const currentlyUnlocked = current.filter(p => p.isUnlocked).length;
      
      if (targetUnlocked > currentlyUnlocked) {
        const toUnlock = targetUnlocked - currentlyUnlocked;
        let unlockedCount = 0;
        
        return current.map(p => {
          if (!p.isUnlocked && unlockedCount < toUnlock) {
            unlockedCount++;
            const randX = Math.random() * (100 - this.pieceSizePct()); 
            const randY = Math.random() * (100 - this.pieceSizePct());
            return {
              ...p,
              isUnlocked: true,
              isScattered: true,
              currentX: randX,
              currentY: randY,
              zIndex: 10 + p.id
            };
          }
          return p;
        });
      }
      return current;
    });
  }

  onArchive() {
    this.puzzleCompleted.emit();
  }
  
  autoAssemble() {
    // Instantly snap all pieces to their correct locations
    const sizePct = this.pieceSizePct();
    this.pieces.update(ps => ps.map(p => ({
      ...p,
      currentX: p.correctCol * sizePct,
      currentY: p.correctRow * sizePct,
      isLocked: true,
      zIndex: 1
    })));
  }

  // --- Drag & Drop Logic ---
  private startX = 0;
  private startY = 0;
  private initialLeft = 0;
  private initialTop = 0;
  private currentDragPiece: PuzzlePiece | null = null;

  startDrag(event: MouseEvent | TouchEvent, piece: PuzzlePiece) {
    if (this.readonly() || piece.isLocked) return; // Disable drag if readonly
    event.preventDefault();
    this.draggingPieceId.set(piece.id);
    this.currentDragPiece = piece;
    this.pieces.update(ps => ps.map(p => p.id === piece.id ? { ...p, zIndex: 100 } : p));

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.startX = clientX;
    this.startY = clientY;
    this.initialLeft = piece.currentX;
    this.initialTop = piece.currentY;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('touchmove', this.onMouseMove, { passive: false });
    document.addEventListener('touchend', this.onMouseUp);
  }

  private onMouseMove = (event: MouseEvent | TouchEvent) => {
    if (!this.currentDragPiece || !this.boardContainer()) return;
    event.preventDefault();

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;

    const rect = this.boardContainer()!.nativeElement.getBoundingClientRect();
    const percentDeltaX = (deltaX / rect.width) * 100;
    const percentDeltaY = (deltaY / rect.height) * 100;

    const newX = this.initialLeft + percentDeltaX;
    const newY = this.initialTop + percentDeltaY;

    this.pieces.update(ps => ps.map(p => 
      p.id === this.currentDragPiece!.id 
        ? { ...p, currentX: newX, currentY: newY } 
        : p
    ));
  };

  private onMouseUp = () => {
    this.stopDrag();
  };

  private stopDrag() {
    if (!this.currentDragPiece) return;
    this.checkSnap(this.currentDragPiece);
    this.draggingPieceId.set(null);
    this.currentDragPiece = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onMouseMove);
    document.removeEventListener('touchend', this.onMouseUp);
  }

  private checkSnap(piece: PuzzlePiece) {
    const sizePct = this.pieceSizePct();
    const targetX = piece.correctCol * sizePct;
    const targetY = piece.correctRow * sizePct;
    const threshold = 15; // Tolerance
    const dist = Math.sqrt(Math.pow(piece.currentX - targetX, 2) + Math.pow(piece.currentY - targetY, 2));

    if (dist < threshold) {
      this.pieces.update(ps => ps.map(p => 
        p.id === piece.id 
          ? { ...p, currentX: targetX, currentY: targetY, isLocked: true, zIndex: 1 } 
          : p
      ));
    }
  }
}
