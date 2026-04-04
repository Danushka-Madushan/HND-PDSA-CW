declare module 'outage-tracker' {
  interface Outage {
    priority: number;
    city: string;
    address: string;
    reportedAt: string;
  }

  interface CityRecord {
    name: string;
    city: string;
    address: string;
    phone: string;
    category: "Infrastructure" | "Person";
  }
}
