import type { CityRecord } from 'outage-tracker';

/**
 * A simple linked list node to store records.
 */
class RecordLink {
  public record: CityRecord;
  public next: RecordLink | null;

  constructor(record: CityRecord, next: RecordLink | null = null) {
    this.record = record;
    this.next = next;
  }
}

/**
 * A Node in the Trie.
 */
class TrieNode {
  /* Explicitly declared fields */
  public children: { [key: string]: TrieNode };
  public records: RecordLink | null;

  constructor() {
    this.children = {};
    this.records = null;
  }
}

export class PhoneTrie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Inserts a record into the Trie based on the phone string.
   */
  public insert(record: CityRecord): void {
    let current = this.root;
    const phone = record.phone;

    for (let i = 0; i < phone.length; i++) {
      const char = phone[i];
      if (!current.children[char]) {
        current.children[char] = new TrieNode();
      }
      current = current.children[char];
    }
    /* Add the record to the linked list at this specific node */
    current.records = new RecordLink(record, current.records);
  }

  /**
   * Finds all records that start with the given prefix.
   */
  public search(prefix: string): CityRecord[] {
    let current = this.root;

    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (!current.children[char]) {
        return [];
      }
      current = current.children[char];
    }

    const results: CityRecord[] = [];
    this.collectAll(current, results);
    return results;
  }

  private collectAll(node: TrieNode, results: CityRecord[]): void {
    let link = node.records;
    while (link) {
      results.push(link.record);
      link = link.next;
    }

    for (const char in node.children) {
      if (Object.prototype.hasOwnProperty.call(node.children, char)) {
        this.collectAll(node.children[char], results);
      }
    }
  }
}
