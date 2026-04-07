interface HasPriority {
  priority: number;
}

/**
  * Performs a Heap Sort on an array of records.
  * This is what we use inside setOutages and for sorting routes.
  */
export class OutageMaxHeap<T extends HasPriority> {
  private heap: T[];

  constructor() {
    this.heap = [];
  }

  /* sort method */
  public static sort<U extends HasPriority>(records: U[]): U[] {
    const h = new OutageMaxHeap<U>();
    h.heap = [...records];
    
    /* Build the heap (O(n)) using heapify-down from the last non-leaf node */
    for (let i = Math.floor(h.size() / 2) - 1; i >= 0; i--) {
      h.bubbleDown(i);
    }

    /* Extract elements in descending order (O(n log n)) */
    const sorted: U[] = [];
    while (h.size() > 0) {
      const max = h.extractMax();
      if (max) sorted.push(max);
    }
    return sorted;
  }

  private size(): number {
    return this.heap.length;
  }

  private extractMax(): T | null {
    if (this.size() === 0) return null;
    if (this.size() === 1) return this.heap.pop() || null;

    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return max;
  }

  private bubbleDown(index: number): void {
    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < this.size() && this.heap[left].priority > this.heap[largest].priority) {
        largest = left;
      }
      if (right < this.size() && this.heap[right].priority > this.heap[largest].priority) {
        largest = right;
      }
      if (largest === index) break;

      this.swap(index, largest);
      index = largest;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
