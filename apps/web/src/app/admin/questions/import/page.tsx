'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

interface ImportError {
  row: number;
  reason: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
    } else {
      toast.error('Please upload an Excel file (.xlsx)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} questions`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/questions')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Questions</h1>
          <p className="text-gray-400 text-sm">Upload an Excel file to bulk import questions</p>
        </div>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`glass-card p-12 text-center border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
          {file ? (
            <div className="animate-scale-in">
              <FileSpreadsheet className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">{file.name}</p>
              <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <>
              <Upload className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg mb-2">Drop your Excel file here</p>
              <p className="text-gray-400 text-sm">or click to browse</p>
            </>
          )}
        </div>
      )}

      {/* Expected Format */}
      {!result && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Expected Columns</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['question_text*', 'option_a*', 'option_b*', 'option_c', 'option_d', 'option_e', 'correct_answer*', 'explanation', 'difficulty', 'category_name'].map((col) => (
              <div key={col} className="bg-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                {col}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">* Required fields. Missing required fields will cause the row to be skipped.</p>
        </div>
      )}

      {/* Import Button */}
      {file && !result && (
        <button onClick={handleImport} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {uploading ? 'Importing...' : 'Import Questions'}
        </button>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{result.imported}</p>
              <p className="text-sm text-gray-400">Imported</p>
            </div>
            <div className="glass-card p-6 text-center">
              <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{result.skipped}</p>
              <p className="text-sm text-gray-400">Skipped</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Errors ({result.errors.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/10 rounded-lg px-3 py-2">
                    <span className="text-rose-400 text-xs font-mono whitespace-nowrap">Row {err.row}</span>
                    <span className="text-gray-300 text-xs">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setResult(null); setFile(null); }} className="btn-secondary flex-1">Import More</button>
            <button onClick={() => router.push('/admin/questions')} className="btn-primary flex-1">View Questions</button>
          </div>
        </div>
      )}
    </div>
  );
}
