"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type Dataset } from "@/lib/api";

interface DatasetContextValue {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  activeDatasetId: number | null;
  setActiveDatasetId: (id: number) => void;
  refreshDatasets: (selectId?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDatasets = useCallback(async (selectId?: number) => {
    try {
      setLoading(true);
      setError(null);
      let list = await api.listDatasets();
      if (list.length === 0) {
        const seeded = await api.loadSampleDataset();
        list = [seeded];
      }
      setDatasets(list);
      if (selectId !== undefined) {
        setActiveDatasetId(selectId);
      } else {
        setActiveDatasetId((prev) => {
          if (prev !== null && list.some((d) => d.id === prev)) {
            return prev;
          }
          return list[0]?.id ?? null;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDatasets();
  }, [refreshDatasets]);

  const activeDataset =
    datasets.find((d) => d.id === activeDatasetId) ?? null;

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDataset,
        activeDatasetId,
        setActiveDatasetId,
        refreshDatasets,
        loading,
        error,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) {
    throw new Error("useDataset must be used within a DatasetProvider");
  }
  return ctx;
}
