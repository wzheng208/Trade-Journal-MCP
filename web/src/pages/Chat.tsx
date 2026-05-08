import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  apiRequest,
  type CsvImportResponse,
  type TradeImport,
} from '../lib/api';
import { Database, LogOut, Send, Upload } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const { session, user, loading, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [imports, setImports] = useState<TradeImport[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!session) return;

    apiRequest<{ imports: TradeImport[] }>({
      token: session.access_token,
      path: '/api/imports',
    })
      .then((data) => setImports(data.imports))
      .catch(() => setImportStatus('Could not load imports.'));
  }, [session]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const data = await apiRequest<{ message?: { content?: string } }>({
        token: session.access_token,
        path: '/api/chat',
        method: 'POST',
        body: {
          messages: nextMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        },
      });

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message?.content ?? 'No response.',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setImportStatus('');

    try {
      const csvText = await file.text();
      const data = await apiRequest<CsvImportResponse>({
        token: session.access_token,
        path: '/api/imports/csv',
        method: 'POST',
        body: {
          fileName: file.name,
          csvText,
        },
      });

      setImports((prev) => [
        {
          id: data.import.datasetId,
          file_name: data.preview.fileName,
          status: 'imported',
          total_rows: data.import.totalRows,
          valid_rows: data.import.validRows,
          invalid_rows: data.import.invalidRows,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setImportStatus(
        `Imported ${data.import.validRows} of ${data.import.totalRows} rows from ${data.preview.fileName}.`,
      );
    } catch (error) {
      setImportStatus(
        error instanceof Error ? error.message : 'CSV import failed.',
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const latestImport = imports[0];
  const suggestions = [
    'Show my PnL summary',
    'What is my win rate?',
    'Performance by symbol',
    'Compare long vs short',
    'What weekday is weakest?',
    'Largest win and loss',
  ];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
        <h1 className="text-sm font-semibold tracking-tight">Trade Journal</h1>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Database className="h-3.5 w-3.5" />
            {latestImport
              ? `${latestImport.valid_rows} trades imported`
              : 'No trades imported'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCsv(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-8 gap-1.5"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {importing ? 'Importing' : 'Import CSV'}
            </span>
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {user?.email}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-8 w-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {(latestImport || importStatus) && (
            <div className="rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-3 text-xs text-muted-foreground">
              {latestImport && (
                <div className="font-medium text-foreground">
                  Latest import: {latestImport.file_name} ·{' '}
                  {latestImport.valid_rows}/{latestImport.total_rows} valid rows
                  {latestImport.invalid_rows > 0
                    ? ` · ${latestImport.invalid_rows} invalid`
                    : ''}
                </div>
              )}
              {importStatus && <div className="mt-1">{importStatus}</div>}
            </div>
          )}

          {messages.length === 0 && (
            <div className="pt-16 text-center">
              <p className="text-sm text-muted-foreground">
                Ask a rule-based analytics question about your trades.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="rounded-md border border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3 sm:px-6">
        <form onSubmit={sendMessage} className="mx-auto flex max-w-2xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
