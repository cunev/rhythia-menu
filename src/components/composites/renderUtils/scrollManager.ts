import p5 from "p5";

export interface ScrollState {
  scroll: number;
  smoothScroll: number;
  scrollVelocity: number;
  lastMouseY: number;
  isDragging: boolean;
  scrollBarDragging: boolean;
  scrollBarDraggingRight: boolean;
  startPosition: { x: number; y: number };
  startScroll: number;
  scrollBarY: number;
  scrollBarHeight: number;
  scrollBarWidth: number;
  scrollBarPadding: number;

  update: () => void;
  constrainScroll: (min: number, max: number) => void;
  handleMouseWheel: (event: any) => void;
  startDrag: (mouseX: number, mouseY: number) => void;
  startScrollBarDrag: (mouseX: number, mouseY: number) => void;
  endDrag: () => void;
}

/**
 * Create a scroll manager
 */
export function useScrollManager(p: p5): ScrollState {
  const scrollState: ScrollState = {
    scroll: 0,
    smoothScroll: 0,
    scrollVelocity: 0,
    lastMouseY: 0,
    isDragging: false,
    scrollBarDragging: false,
    scrollBarDraggingRight: false,
    startPosition: { x: 0, y: 0 },
    startScroll: -1,
    scrollBarY: 0,
    scrollBarHeight: 0,
    scrollBarWidth: 8,
    scrollBarPadding: 16,

    /**
     * Update scroll position based on current state
     */
    update() {
      // Apply momentum when not dragging
      if (!this.isDragging && !this.scrollBarDragging) {
        this.scroll += this.scrollVelocity;
        this.scrollVelocity *= 0.97;
        if (Math.abs(this.scrollVelocity) < 0.1) this.scrollVelocity = 0;
      }

      // Apply dragging movement
      if (this.startScroll !== -1 && !this.scrollBarDragging) {
        this.scroll = this.startScroll + (this.startPosition.y - p.mouseY);
        this.scrollVelocity = this.lastMouseY - p.mouseY;
        this.lastMouseY = p.mouseY;
      }

      // Apply smooth scrolling
      this.smoothScroll += (this.scroll - this.smoothScroll) / 10;
    },

    /**
     * Constrain scroll within bounds
     */
    constrainScroll(min: number, max: number) {
      this.scroll = p.constrain(this.scroll, min, max);
    },

    /**
     * Handle mouse wheel events
     */
    handleMouseWheel(event: any) {
      this.scroll += event.delta * 0.4;
      this.scrollVelocity = event.delta * 0.2;
    },

    /**
     * Start dragging the content
     */
    startDrag(mouseX: number, mouseY: number) {
      this.isDragging = true;
      this.startPosition = { x: mouseX, y: mouseY };
      this.lastMouseY = mouseY;
      this.startScroll = this.scroll;
      this.scrollVelocity = 0;
    },

    /**
     * Start dragging the scrollbar
     */
    startScrollBarDrag(mouseX: number, mouseY: number) {
      this.scrollBarDragging = true;
      this.startPosition = {
        x: mouseX - (p.width - this.scrollBarPadding - this.scrollBarWidth / 2),
        y: mouseY - this.scrollBarY,
      };
      this.scrollVelocity = 0;
    },

    /**
     * End any dragging operations
     */
    endDrag() {
      this.scrollBarDraggingRight = false;

      if (!this.scrollBarDragging && this.isDragging) {
        this.scrollVelocity *= 1.8;
        const maxVelocity = 60;
        this.scrollVelocity = p.constrain(
          this.scrollVelocity,
          -maxVelocity,
          maxVelocity
        );
      }

      this.isDragging = false;
      this.scrollBarDragging = false;
      this.startPosition = { x: 0, y: 0 };
      this.startScroll = -1;
    },
  };

  return scrollState;
}
