import type { OutageRoute } from 'outage-tracker';
import { mapDataRaw } from '../constant/map_content';

/**
 * Min-Heap node for the Priority Queue used in Dijkstra.
 */
class HeapNode {
  public id: string;
  public priority: number;

  constructor(id: string, priority: number) {
    this.id = id;
    this.priority = priority;
  }
}

/**
 * Min-Heap implementation for Dijkstra optimization.
 */
class MinHeap {
  private heap: HeapNode[];

  constructor() {
    this.heap = [];
  }

  public push(node: HeapNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): HeapNode | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0 && bottom) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parent].priority) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }
}

export class PowerGridGraph {
  private adjacencyList: { [key: string]: { node: string; weight: number }[] };
  private cityNameMap: { [key: string]: string };
  private nodeIds: string[] = [];

  constructor() {
    this.adjacencyList = {};
    this.cityNameMap = {};
    this.buildGraph();
    this.nodeIds = Object.keys(this.adjacencyList);
  }

  private buildGraph(): void {
    /* Map city names to node IDs */
    mapDataRaw.nodes.forEach(node => {
      this.cityNameMap[node.name] = node.id;
      this.adjacencyList[node.id] = [];
    });

    /* Build adjacency list from edges */
    mapDataRaw.edges.forEach(edge => {
      this.adjacencyList[edge.source].push({ node: edge.target, weight: edge.weight });
      /* Undirected */
      this.adjacencyList[edge.target].push({ node: edge.source, weight: edge.weight });
    });
  }

  public findShortestPath(destinationCity: string, sectorName: string, priority: number, timestamp: number): OutageRoute | null {
    /* starting point */
    const startNode = "eb_65";
    const targetNode = this.cityNameMap[destinationCity];

    if (!targetNode) return null;

    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const pq = new MinHeap();

    /* Initialize */
    this.nodeIds.forEach(nodeId => {
      distances[nodeId] = Infinity;
      previous[nodeId] = null;
    });

    distances[startNode] = 0;
    pq.push(new HeapNode(startNode, 0));

    while (!pq.isEmpty()) {
      const current = pq.pop();
      if (!current || current.priority > distances[current.id]) continue;
      if (current.id === targetNode) break;

      this.adjacencyList[current.id].forEach(neighbor => {
        const alt = distances[current.id] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = current.id;
          pq.push(new HeapNode(neighbor.node, alt));
        }
      });
    }

    return this.formatResult(targetNode, previous, distances[targetNode], destinationCity, sectorName, priority, timestamp);
  }

  private formatResult(
    targetId: string,
    prev: Record<string, string | null>,
    dist: number,
    city: string,
    sectorName: string,
    priority: number,
    timestamp: number
  ): OutageRoute {
    const path: string[] = [];
    let curr: string | null = targetId;

    while (curr) {
      /* Strip "node_" or "eb_" prefix to match your sample "65, 89..." format */
      path.push(curr.replace(/^(node_|eb_)/, ''));
      curr = prev[curr];
    }
    path.reverse();

    return {
      id: `r_${targetId}`,
      label: `Node ${targetId.replace(/^(node_|eb_)/, '')} — ${city}`,
      nodePath: path.join(', '),
      distance: dist.toFixed(1),
      sector: sectorName,
      priority: priority,
      timestamp: timestamp
    };
  }
}
