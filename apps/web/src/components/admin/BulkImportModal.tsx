'use client';

import { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
    if (!isExcel) {
      toast.error('Only Excel files (.xlsx, .xls) are allowed.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success(`Import complete! ${data.imported} imported, ${data.skipped} skipped.`);
      
      if (data.errors && data.errors.length > 0) {
        console.warn('Import errors:', data.errors);
        toast.warning('Some rows had errors. Check console for details.');
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to import questions');
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Bulk Import</h2>
            <p className="text-sm text-gray-400 mt-1">Upload an Excel file to bulk import questions.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Download Template CTA */}
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Need a template?</p>
                <p className="text-xs text-gray-400">Download the required Excel format.</p>
              </div>
            </div>
            <a 
              href="/question_template.xlsx" 
              download 
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Template
            </a>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
              ${isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/30 hover:bg-white/5'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {file ? (
              <>
                <FileSpreadsheet className="w-12 h-12 text-emerald-400 mb-4" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-4 text-xs text-rose-400 hover:text-rose-300"
                >
                  Remove file
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">XLSX or XLS files only (max. 10MB)</p>
              </>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              'Import Questions'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
