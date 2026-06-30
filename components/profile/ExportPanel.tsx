'use client';

import { useState } from 'react';
import { 
  Download, FileText, FileSpreadsheet, FileJson,
  CheckCircle, AlertCircle, X, Archive, Send
} from 'lucide-react';

interface ExportPanelProps {
  user: any;
  onClose: () => void;
}

export default function ExportPanel({ user, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'memus' | 'docs' | 'all'>('memus');
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage('');
    
    try {
      // Load data from localStorage
      const memus = JSON.parse(localStorage.getItem('memus_data') || '[]');
      const sentMemus = JSON.parse(localStorage.getItem('sent_memus_data') || '[]');
      const drafts = JSON.parse(localStorage.getItem('drafts_data') || '[]');
      const docs = JSON.parse(localStorage.getItem('memu_docs_v2') || '[]');
      
      let data = {};
      
      if (exportType === 'memus') {
        data = { inbox: memus, sent: sentMemus, drafts };
      } else if (exportType === 'docs') {
        data = { documents: docs };
      } else {
        data = { 
          user: { name: user.name, email: user.email, handle: user.handle },
          memus: { inbox: memus, sent: sentMemus, drafts },
          docs: docs,
          exportDate: new Date().toISOString()
        };
      }
      
      let blob: Blob;
      let filename: string;
      
      if (format === 'csv') {
        // Convert to CSV (simplified)
        const csvRows = [];
        if (exportType === 'memus') {
          csvRows.push(['Type', 'From/To', 'Subject', 'Date', 'Status']);
          memus.forEach((m: any) => {
            csvRows.push(['Inbox', m.from, m.subject, m.time, m.status]);
          });
          sentMemus.forEach((m: any) => {
            csvRows.push(['Sent', m.to, m.subject, m.time, 'Sent']);
          });
        }
        blob = new Blob([csvRows.map(row => row.join(',')).join('\n')], { type: 'text/csv' });
        filename = `memu_export_${Date.now()}.csv`;
      } else if (format === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `memu_export_${Date.now()}.json`;
      } else {
        // PDF fallback - simple text
        const textContent = JSON.stringify(data, null, 2);
        blob = new Blob([textContent], { type: 'application/pdf' });
        filename = `memu_export_${Date.now()}.pdf`;
      }
      
      // Download file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage(`Exported successfully as ${format.toUpperCase()}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage('Export failed. Please try again.');
    }
    
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col h-full bg-memu-canvas rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm px-6 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Download size={18} strokeWidth={2} className="text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Export Data</h1>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 btn-press">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p className="text-sm text-gray-500 font-light mt-1">Download your memus and documents</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex items-center gap-2 border border-emerald-200">
              <CheckCircle size={14} strokeWidth={2} className="text-emerald-600" />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-sm flex items-center gap-2 border border-rose-200">
              <AlertCircle size={14} strokeWidth={2} className="text-rose-600" />
              {errorMessage}
            </div>
          )}

          {/* Export Type Selection */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">What to export?</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportType('memus')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  exportType === 'memus'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Send size={22} strokeWidth={2} className={exportType === 'memus' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">Memus</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Inbox, Sent, Drafts</span>
                </div>
              </button>
              <button
                onClick={() => setExportType('docs')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  exportType === 'docs'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText size={22} strokeWidth={2} className={exportType === 'docs' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">Documents</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Docs, Slides, Sheets</span>
                </div>
              </button>
              <button
                onClick={() => setExportType('all')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  exportType === 'all'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Archive size={22} strokeWidth={2} className={exportType === 'all' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">All Data</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Complete backup</span>
                </div>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-5 mb-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 tracking-tight">Export format</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  format === 'csv'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={22} strokeWidth={2} className={format === 'csv' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">CSV</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Spreadsheet format</span>
                </div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  format === 'json'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileJson size={22} strokeWidth={2} className={format === 'json' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">JSON</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Developer format</span>
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 transition-all btn-press ${
                  format === 'pdf'
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText size={22} strokeWidth={2} className={format === 'pdf' ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-900">PDF</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center">Document format</span>
                </div>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 btn-press"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} strokeWidth={2} />
                Export {exportType === 'all' ? 'All Data' : exportType === 'memus' ? 'Memus' : 'Documents'} as {format.toUpperCase()}
              </>
            )}
          </button>

          {/* Info Note */}
          <p className="text-xs text-gray-400 text-center mt-4 font-light">
            Your data is exported from your local device. No data is sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}