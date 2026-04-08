<p align="center">
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/public/favicon.svg" width="96" alt="Electricity Outage Tracker Logo" />
</p>

<h1 align="center">Electricity Outage Tracker</h1>

<p align="center">
  <i>A Data Structures & Algorithms demonstration built around emergency power grid management.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/DSA-Trie%20%7C%20Heap%20%7C%20Graph-f0b429?style=flat-square" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Purpose-Academic%20Coursework-58a6ff?style=flat-square" />
</p>

---

## Executive Summary
The **Electricity Outage Tracker** is a management system designed to coordinate emergency responses to power failures across a simulated regional grid. Developed to modernize power grid breakdown response (modeled after the Sri Lankan context), it transitions from manual workflows to an automated system grounded in **Graph Theory**, **Hierarchical Sorting (Heaps)**, and **Prefix-Based Retrieval (Tries)**. The system achieves significant reductions in response latency and operational overhead by making the breakdown restoration process "algorithmic."

---

## Problem Statement: The Sri Lankan Context
Manual utility management often faces three critical bottlenecks:
1.  **Subjective Prioritization:** Outage reports are often handled first-come-first-served, ignoring the "Criticality Index" (e.g., hospitals vs. residential areas).
2.  **The "Known Route" Fallacy:** Breakdown crews typically follow familiar routes rather than the mathematically shortest path, leading to fuel waste and delayed restoration.
3.  **Search Inefficiency:** Finding consumer details in large databases using traditional search methods is slow during peak outage periods.

---

## Core Pillars & Implementation

The system is built around three fundamental Data Structures:

| # | Pillar | Implementation | Complexity |
|---|--------|----------------|:----------:|
| 1 | **Information Retrieval** | Trie (Prefix Tree) + Linked Lists | `O(m)` |
| 2 | **Priority Management** | Max-Heap & HeapSort | `O(n log n)` |
| 3 | **Path Optimization** | Graph Theory & Dijkstra's Algorithm | `O(E log V)` |

---

## Technical Deep Dive

### Customer Lookup — Trie (Prefix Tree) with Linked Lists
> `src/dsa/trie_ds.ts`

To handle a large database of customer records, the system employs a **Trie**, enabling near-instantaneous search by phone number as an operator types.

- **The Problem:** Simple list searches are too slow $O(n)$ as the database grows.
- **The Solution:** A specialized tree where search time is proportional only to the length of the phone number ($m$), regardless of total records.
- **Linked List Integration:** Terminal nodes contain a **Singly Linked List** (`RecordLink`) to handle multiple records sharing a prefix, ensuring memory efficiency.

```typescript
/* Internal Logic: Prefix Collection */
private collectAll(node: TrieNode, results: CityRecord[]): void {
  let link = node.records;
  while (link) {
    results.push(link.record);
    link = link.next;
  }
  for (const char in node.children) {
    this.collectAll(node.children[char], results);
  }
}
```

### Outage Prioritization — Max-Heap & HeapSort
> `src/dsa/heap_ds.ts`

Outages are addressed by severity using a **Max-Heap** to ensure high-priority infrastructure (hospitals, schools) is serviced first.

- **Multi-Level Comparison:** Prioritization uses `priority` (1-10) as the primary key and `timestamp` (earlier reports first) as a secondary tie-breaker.
- **Heap Sort:** The "Active Outages" list uses Heap Sort to guarantee $O(n \log n)$ performance, providing stability even during high-pressure scenarios with thousands of reports.

### Route Optimization — Graph Theory & Dijkstra's Algorithm
> `src/dsa/graph_ds.ts`

The regional power grid is modeled as a **Weighted Undirected Graph** — cities as nodes, power lines as edges weighted by distance.

- **Adjacency List:** Chosen over a matrix for space efficiency $O(V+E)$ given the grid's sparse connections.
- **Dijkstra's Algorithm:** Computes the shortest path from the central hub to affected cities. Optimized with a **Min-Heap Priority Queue**, reducing complexity from $O(V^2)$ to $O(E \log V)$.

```typescript
/* Dijkstra Optimization with Min-Heap */
while (!pq.isEmpty()) {
  const current = pq.pop();
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
```

---

## Algorithmic Efficiency & Scalability

| Operation | Manual System (Estimated) | Enhanced System (DSA) | Complexity |
| :--- | :--- | :--- | :--- |
| **Search User** | $O(N)$ (Scan) | **Trie Search** | $O(m)$ |
| **Prioritize** | $O(N^2)$ (Human Sort) | **Heap Sort** | $O(N \log N)$ |
| **Route Path** | Known Path | **Dijkstra + Min-Heap** | $O((E+V) \log V)$ |
| **Update Grid** | High Overhead | **Adjacency List Mod** | $O(1)$ |

---

## System Functionalities & Visual Analysis

1.  **Consumer Identification:** Instant database filtering via **Trie** as phone numbers are entered.
2.  **Severity Assessment:** Reports include priority levels (e.g., Level 9 for hospitals).
3.  **Real-time Re-sorting:** **Max-Heap** automatically moves critical tasks to the top.
4.  **Route Generation:** **Graph** queries highlight the shortest visual path on the map.

<p align="center">
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/tree_lookup.png" width="48%" alt="Trie Lookup" />
  &nbsp;
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/shortest_path.png" width="48%" alt="Dijkstra Shortest Path" />
</p>

---

## Technologies & Selling Points

- **Core Logic:** TypeScript (Strong typing for memory-safe DSA implementation).
- **Visualization:** React 18 with SVG-based Map Rendering.
- **Data Source:** `.graphml` files converted to JSON Adjacency Lists.

**Key Benefits:**
- **Reduced Downtime:** Lower SAIDI through faster crew dispatch and priority triage.
- **Fuel Efficiency:** Mathematical pathing reduces unnecessary mileage.
- **Auditability:** Transparent algorithmic decisions remove accusations of mismanagement.

---

## Conclusion
The **Enhanced Outage Management System** proves that sophisticated data structures are essential tools for infrastructure management. By modeling the grid as a graph and the outage queue as a heap, we have created a blueprint for efficient, data-driven public service delivery.
