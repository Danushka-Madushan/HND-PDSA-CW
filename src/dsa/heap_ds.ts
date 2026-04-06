import type { OutageRecord } from 'outage-tracker';

/**
  * Performs a Heap Sort on an array of records.
  * This is what we use inside setOutages.
  */
export class OutageMaxHeap {
  private heap: OutageRecord[];

  constructor() {
    this.heap = [];
  }

  /* sort method */
  public static sort(records: OutageRecord[]): OutageRecord[] {
    const h = new OutageMaxHeap();
    h.heap = [...records];
    
    /* Build the heap (O(n)) using heapify-down from the last non-leaf node */
    for (let i = Math.floor(h.size() / 2) - 1; i >= 0; i--) {
      h.bubbleDown(i);
    }

    /* Extract elements in descending order (O(n log n)) */
    const sorted: OutageRecord[] = [];
    while (h.size() > 0) {
      const max = h.extractMax();
      if (max) sorted.push(max);
    }
    return sorted;
  }

  private size(): number {
    return this.heap.length;
  }

  private extractMax(): OutageRecord | null {
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
