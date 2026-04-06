<p align="center">
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/public/favicon.svg" width="100" alt="Electricity Outage Tracker Logo" />
</p>

<h1 align="center">Electricity Outage Tracker</h1>

<p align="center">
  <strong>Data Structures and Algorithms Demonstration</strong>
</p>

## Project Overview
The Electricity Outage Tracker is a specialized management system designed to coordinate emergency responses to power failures across a simulated regional grid. While the application provides a functional interface for reporting and visualizing outages, its primary objective is to demonstrate the practical application of fundamental Data Structures and Algorithms (DSA) in a real-world infrastructure scenario.

The system centers on three core pillars of computer science:
1. **Efficient Information Retrieval** via a Prefix Tree (Trie).
2. **Dynamic Priority Management** via a Max-Heap and HeapSort.
3. **Geospatial Path Optimization** via Graph Theory and Dijkstra's Algorithm.

---

## Technical Implementation

### Customer Lookup: Trie (Prefix Tree) with Linked Lists
**Location:** `src/dsa/trie_ds.ts`

To handle a large database of customer records, the system employs a Trie data structure. This allows for near-instantaneous searching of customers by phone number as an operator types.

![Customer Search Lookup](https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/tree_lookup.png)

*   **Structure:** Each node in the Trie represents a single digit (0-9).
*   **Collision Management:** To handle instances where multiple records might share a prefix or number, each terminal node contains a Singly Linked List (`RecordLink`). This ensures memory efficiency while maintaining fast access.
*   **Performance:** Search operations are $O(m)$, where $m$ is the length of the search string. This makes the search speed independent of the total number of records in the database, providing a consistent user experience.

### Outage Prioritization: Max-Heap and HeapSort
**Location:** `src/dsa/heap_ds.ts`

In emergency management, outages must be addressed based on severity rather than the order they were reported. The system uses a Max-Heap to ensure that high-priority infrastructure (like hospitals or schools) is always serviced first.

<p align="center">
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/set_priority.png" width="45%" alt="Set Outage Priority" />
  <img src="https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/outage_priority.png" width="45%" alt="Outages Sorted Using Max Heap" />
</p>

*   **Mechanism:** When new outages are reported, the system utilizes the HeapSort algorithm to re-organize the records. 
*   **Algorithm:**
    *   **Build-Heap:** The system transforms an array of records into a valid Max-Heap structure in $O(n)$ time.
    *   **Sort:** It extract elements in descending order of priority, resulting in a sorted list in $O(n \log n)$ time.
*   **Application:** This ensures that the "Active Outages" list is always ordered by the highest priority level, allowing dispatchers to focus on critical repairs immediately.

### Route Optimization: Graph Theory and Dijkstra's Algorithm
**Location:** `src/dsa/graph_ds.ts`

The regional power grid is modeled as a Weighted Undirected Graph. Cities are represented as nodes, and the roads or power lines connecting them are represented as edges with weights corresponding to physical distances.

![Shortest Path using Dijkstra's Algorithm](https://raw.githubusercontent.com/Danushka-Madushan/HND-PDSA-CW/refs/heads/main/screens/shortest_path.png)

*   **Adjacency List:** The graph is stored using an Adjacency List, which is memory-efficient for the relatively sparse connections of a regional map.
*   **Optimization:** The system implements Dijkstra's Algorithm to find the shortest path between the "Regional Electricity Board" (the source node) and the city where an outage has occurred.
*   **Min-Heap Priority Queue:** To optimize the Dijkstra implementation, a Min-Heap is used to always select the next node with the smallest known distance, reducing the time complexity to $O(E \log V)$.
*   **Path Reconstruction:** The algorithm maintains a "previous" node map, allowing the system to reconstruct and visualize the exact sequence of nodes maintenance teams must traverse.

---

## Technical Summary

| Feature | Data Structure | Algorithm | Complexity |
| :--- | :--- | :--- | :--- |
| **Customer Search** | Trie (Prefix Tree) | Prefix Search + DFS | $O(m)$ |
| **Outage Ordering** | Max-Heap | HeapSort | $O(n \log n)$ |
| **Route Planning** | Graph (Adjacency List) | Dijkstra's (with Min-Heap) | $O(E \log V)$ |

## Tools and Resources
*   The mock graph data and coordinates for this project were modeled using [Graph Online](https://graphonline.top/en/).
