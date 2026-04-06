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

## Overview

The **Electricity Outage Tracker** is a management system designed to coordinate emergency responses to power failures across a simulated regional grid. While it provides a functional interface for reporting and visualizing outages, its primary goal is to demonstrate fundamental Data Structures and Algorithms in a real-world infrastructure scenario.

The system is built around three core pillars:

| # | Pillar | Implementation |
|---|--------|----------------|
| 1 | **Efficient Information Retrieval** | Prefix Tree (Trie) |
| 2 | **Dynamic Priority Management** | Max-Heap & HeapSort |
| 3 | **Geospatial Path Optimization** | Graph Theory & Dijkstra's Algorithm |

---

## Technical Implementation

### 1 · Customer Lookup — Trie (Prefix Tree) with Linked Lists
> `src/dsa/trie_ds.ts`

To handle a large database of customer records, the system employs a **Trie** data structure, enabling near-instantaneous customer search by phone number as an operator types.

![Customer Search Lookup](https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/tree_lookup.png)

- **Structure:** Each node represents a single digit (0–9).
- **Collision Management:** Terminal nodes contain a **Singly Linked List** (`RecordLink`) to handle multiple records sharing a prefix, ensuring memory efficiency without sacrificing access speed.
- **Performance:** Search runs in **O(m)** time, where *m* is the length of the search string — independent of the total number of records in the database.

---

### 2 · Outage Prioritization — Max-Heap & HeapSort
> `src/dsa/heap_ds.ts`

Outages must be addressed by severity, not by arrival order. The system uses a **Max-Heap** to ensure high-priority infrastructure (hospitals, schools) is always serviced first.

<p align="center">
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/set_priority.png" width="48%" alt="Set Outage Priority" />
  &nbsp;
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/outage_priority.png" width="48%" alt="Outages Sorted Using Max Heap" />
</p>

When a new outage is reported, **HeapSort** re-organizes the queue in two phases:

- **Build-Heap** — Transforms the record array into a valid Max-Heap in **O(n)** time.
- **Sort** — Extracts elements in descending priority order in **O(n log n)** time.

The result: the "Active Outages" list is always sorted by criticality, so dispatchers can immediately focus on the most urgent repairs.

---

### 3 · Route Optimization — Graph Theory & Dijkstra's Algorithm
> `src/dsa/graph_ds.ts`

The regional power grid is modeled as a **Weighted Undirected Graph** — cities as nodes, roads/power lines as edges weighted by physical distance.

![Shortest Path using Dijkstra's Algorithm](https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/shortest_path.png)

- **Adjacency List** storage keeps the representation memory-efficient for the grid's sparse connections.
- **Dijkstra's Algorithm** computes the shortest path from the Regional Electricity Board (source node) to any affected city.
- A **Min-Heap Priority Queue** within Dijkstra's always selects the next unvisited node with the smallest known distance, achieving **O(E log V)** time complexity.
- A **"previous" node map** enables full path reconstruction, letting the system visualize the exact route maintenance teams must follow.

---

## Technical Summary

| Feature | Data Structure | Algorithm | Complexity |
|:--------|:---------------|:----------|:----------:|
| Customer Search | Trie (Prefix Tree) | Prefix Search + DFS | `O(m)` |
| Outage Ordering | Max-Heap | HeapSort | `O(n log n)` |
| Route Planning | Graph (Adjacency List) | Dijkstra's with Min-Heap | `O(E log V)` |

---

## Tools & Resources

- Mock graph data and coordinates were modeled using [Graph Online](https://graphonline.top/en/).
