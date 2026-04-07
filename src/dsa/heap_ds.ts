interface SortableRecord {
  priority: number;
  timestamp: number;
}

/**
  * Performs a Heap Sort on an array of records.
  * This is what we use inside setOutages and for sorting routes.
  */
export class OutageMaxHeap<T extends SortableRecord> {
  private heap: T[];

  constructor() {
    this.heap = [];
  }

  /* sort method */
  public static sort<U extends SortableRecord>(records: U[]): U[] {
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

  /**
   * Comparison function that defines our heap's "Max" logic.
   * Returns true if record A is "greater than" record B.
   */
  private isGreater(a: T, b: T): boolean {
    if (a.priority > b.priority) return true;
    if (a.priority < b.priority) return false;

    /* Tie-breaker: earlier timestamp is "greater" (appears first in top-down order) */
    return a.timestamp < b.timestamp;
  }

  private bubbleDown(index: number): void {
    while (true) {
      let largest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < this.size() && this.isGreater(this.heap[left], this.heap[largest])) {
        largest = left;
      }
      if (right < this.size() && this.isGreater(this.heap[right], this.heap[largest])) {
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
