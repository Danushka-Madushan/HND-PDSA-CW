declare module 'outage-tracker' {

  interface CityRecord {
    name: string;
    city: string;
    address: string;
    phone: string;
    category: "Infrastructure" | "Person";
  }

  interface NodeData {
    id: string;
    name: string;
    type: "PLACE" | "ELECTRICITY_BOARD";
    x: number;
    y: number;
  }

  interface EdgeData {
    source: string;
    target: string;
    weight: number;
  }

  interface MapData {
    metadata: { district: string; node_count: number; edge_count: number };
    nodes: NodeData[];
    edges: EdgeData[];
  }

  interface OutageRecord {
    id: string;
    priority: number;
    user: CityRecord;
    timestamp: number;
    isNew: boolean;
  }

  interface OutageRoute {
    id: string;
    label: string;
    /* comma-separated node numbers  e.g. "65, 12, 45, 23" */
    nodePath: string;
    distance: string;
    sector: string;
    priority: number;
    timestamp: number;
  }
}
