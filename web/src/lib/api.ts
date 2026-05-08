const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type TradeImport = {
  id: string;
  file_name: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_at: string;
};

export type CsvImportResponse = {
  import: {
    datasetId: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warnings: string[];
  };
  preview: {
    fileName: string;
    warnings: string[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: Array<{
      rowNumber: number;
      errorMessage: string;
      rawData: Record<string, unknown>;
    }>;
  };
};

type ApiOptions = {
  token: string;
  path: string;
  method?: string;
  body?: unknown;
};

export async function apiRequest<T>({
  token,
  path,
  method = 'GET',
  body,
}: ApiOptions): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const fallback = `Request failed with status ${res.status}`;
    let message = fallback;

    try {
      const data = await res.json();
      message = data.error ?? data.message ?? fallback;
    } catch {
      message = fallback;
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
