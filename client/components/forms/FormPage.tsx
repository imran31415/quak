import { useState, useEffect, useCallback } from 'react';
import type { ColumnConfig } from '@shared/types';
import { FormFields } from '../views/FormFields';

interface SchemaResponse {
  id: string;
  name: string;
  columns: ColumnConfig[];
  linkedRecordOptions?: Record<string, Array<{ rowid: number; displayValue: string }>>;
}

export function FormPage() {
  const sheetId = window.location.pathname.replace('/forms/', '');

  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchSchema() {
      try {
        const res = await fetch(`/api/sheets/${sheetId}/schema`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Sheet not found`);
        }
        const data = await res.json();
        // Normalize column data
        if (typeof data.columns === 'string') {
          data.columns = JSON.parse(data.columns);
        }
        setSchema(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchema();
  }, [sheetId]);

  const handleSubmit = useCallback(async (values: Record<string, unknown>) => {
    const res = await fetch(`/api/sheets/${sheetId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Submission failed');
    }
    setSuccess(true);
  }, [sheetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" data-testid="form-page-loading">
        <div className="text-gray-400 dark:text-gray-500">Loading form...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" data-testid="form-page-error">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Error</div>
          <div className="text-gray-500 dark:text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4" data-testid="form-page">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">{schema.name}</h1>

        {success ? (
          <div className="text-center py-6" data-testid="form-page-success">
            <div className="text-green-600 dark:text-green-400 text-lg font-medium mb-2">Response submitted!</div>
            <button
              onClick={() => setSuccess(false)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              data-testid="form-page-submit-another-btn"
            >
              Submit another
            </button>
          </div>
        ) : (
          <FormFields
            columns={schema.columns}
            linkedRecordOptions={schema.linkedRecordOptions}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}

export default FormPage;
