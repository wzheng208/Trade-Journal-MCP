import { randomUUID } from 'node:crypto';
import type { Trade } from '../domain/trades.js';

export type Dataset = {
  id: string;
  createdAt: Date;
  trades: Trade[];
  columns: string[];
  warnings: string[];
};

class DatasetStore {
  private datasets = new Map<string, Dataset>();

  create(input: Omit<Dataset, 'id' | 'createdAt'>): Dataset {
    const dataset: Dataset = {
      id: randomUUID(),
      createdAt: new Date(),
      ...input,
    };
    
    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  get(id: string): Dataset | null {
    return this.datasets.get(id) ?? null;
  }

  listIds(): string[] {
    return [...this.datasets.keys()];
  }
}

export const datasetStore = new DatasetStore();
