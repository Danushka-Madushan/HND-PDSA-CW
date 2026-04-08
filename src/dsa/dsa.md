# Data Structures and Algorithms (DSA) Documentation

This document explains the core data structures and algorithms implemented in the project, their usage, and the technical reasoning behind specific design choices.

---

## 1. Graph Data Structure (`PowerGridGraph`)
**Location:** `src/dsa/graph_ds.ts`

### Overview
The `PowerGridGraph` represents the city's power distribution network. It treats cities as **nodes** and the connections between them as **edges** with specific weights (distances).

### Implementation Details
- **Adjacency List:** The graph uses an adjacency list (`adjacencyList`) to store connections. This is more space-efficient than an adjacency matrix for sparse networks like a power grid.
- **Shortest Path Algorithm:** It implements **Dijkstra's Algorithm** to find the most efficient route from a central hub (starting at node `eb_65`) to any destination city.

### Why use a Min-Heap?
Dijkstra's algorithm requires a **Priority Queue** to constantly retrieve the node with the smallest current distance.
- **Efficiency:** Without a heap, finding the next node would require an $O(n)$ search through all nodes.
- **Performance:** The `MinHeap` implementation reduces this to $O(\log n)$ for insertions and extractions, significantly speeding up route calculations as the network grows.

---

## 2. Heap Data Structure (`OutageMaxHeap`)
**Location:** `src/dsa/heap_ds.ts`

### Overview
The `OutageMaxHeap` is a specialized Max-Heap used to manage and sort power outage records based on their severity.

### Key Logic
- **Priority-Based Sorting:** Outages are sorted primarily by their `priority` level.
- **Tie-breaker:** If two outages have the same priority, the one with the **earlier timestamp** is considered "greater" (more urgent).

### Usage: Heap Sort
The class provides a static `sort` method that performs **Heap Sort**.
- **Why Heap Sort?** It provides a guaranteed $O(n \log n)$ time complexity and sorts in-place (conceptually), making it reliable for ensuring the most critical outages are always addressed first in the UI.

---

## 3. Trie Data Structure (`PhoneTrie`)
**Location:** `src/dsa/trie_ds.ts`

### Overview
The `PhoneTrie` is a prefix tree optimized for searching city and user records via phone numbers.

### Why use a Trie?
- **Prefix Matching:** Tries are exceptionally fast for "search-as-you-type" features. Searching for a prefix takes $O(m)$ time, where $m$ is the length of the search string, regardless of how many thousands of records exist.
- **Space Efficiency:** Common prefixes (like area codes) are stored only once, saving memory compared to storing full strings for every record.

### Why use a Linked List in Trie Nodes?
Each `TrieNode` contains a `records` property pointing to a `RecordLink` (a simple Linked List).
- **Collision Handling:** In cases where multiple people or entities share the same phone number (or for storing multiple records that fall under the same prefix path), a Linked List allows us to append new records in $O(1)$ time.
- **Memory Management:** Unlike an array, a linked list doesn't require contiguous memory or expensive resizing operations when new records are added to a specific node.

---

## Summary of Usage

| Data Structure | Feature | Primary Benefit |
| :--- | :--- | :--- |
| **Graph** | Shortest Path Finding | Models complex network connections. |
| **Min-Heap** | Dijkstra Optimization | Fast retrieval of the "nearest" node. |
| **Max-Heap** | Outage Prioritization | Ensures critical issues are sorted to the top. |
| **Trie** | Phone Number Lookup | Instant prefix-based searching. |
| **Linked List** | Trie Record Storage | Efficiently handles multiple records per node. |
