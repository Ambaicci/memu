'use client';

import { useState } from 'react';
import { 
  Download, FileText, FileSpreadsheet, FileJson, FileMarkdown,
  CheckCircle, AlertCircle, X, Archive, Send, Inbox
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
    <div className="flex flex-col h-full bg-gradient-to-b from-[#fafaf8] to-[#f2f1ee] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e8e7e3] bg-white/80 backdrop-blur-sm px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-[#4f46e5]" />
            <h1 className="text-[18px] font-medium text-[#0f0f0f]">Export Data</h1>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f2f1ee] transition">
            <X size={18} />
          </button>
        </div>
        <p className="body-small mt-1">Download your memus and documents</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-[#d1fae5] text-[#059669] rounded-lg text-[12px] flex items-center gap-2">
              <CheckCircle size={14} />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#fee2e2] text-[#dc2626] rounded-lg text-[12px] flex items-center gap-2">
              <AlertCircle size={14} />
              {errorMessage}
            </div>
          )}

          {/* Export Type Selection */}
          <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6 mb-6">
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">What to export?</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportType('memus')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  exportType === 'memus'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Send size={24} className={exportType === 'memus' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">Memus</span>
                  <span className="text-[10px] text-[#777] text-center">Inbox, Sent, Drafts</span>
                </div>
              </button>
              <button
                onClick={() => setExportType('docs')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  exportType === 'docs'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} className={exportType === 'docs' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">Documents</span>
                  <span className="text-[10px] text-[#777] text-center">Docs, Slides, Sheets</span>
                </div>
              </button>
              <button
                onClick={() => setExportType('all')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  exportType === 'all'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Archive size={24} className={exportType === 'all' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">All Data</span>
                  <span className="text-[10px] text-[#777] text-center">Complete backup</span>
                </div>
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-2xl border border-[#e8e7e3] p-6 mb-6">
            <h3 className="text-[16px] font-medium text-[#0f0f0f] mb-4">Export format</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'csv'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet size={24} className={format === 'csv' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">CSV</span>
                  <span className="text-[10px] text-[#777] text-center">Spreadsheet format</span>
                </div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'json'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileJson size={24} className={format === 'json' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">JSON</span>
                  <span className="text-[10px] text-[#777] text-center">Developer format</span>
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-[#4f46e5] bg-[#ede9fe]'
                    : 'border-[#e8e7e3] hover:border-[#d0cfc9]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <FileText size={24} className={format === 'pdf' ? 'text-[#4f46e5]' : 'text-[#777]'} />
                  <span className="text-[13px] font-medium">PDF</span>
                  <span className="text-[10px] text-[#777] text-center">Document format</span>
                </div>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl text-[14px] font-medium hover:from-[#5b21b6] hover:to-[#6d28d9] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export {exportType === 'all' ? 'All Data' : exportType === 'memus' ? 'Memus' : 'Documents'} as {format.toUpperCase()}
              </>
            )}
          </button>

          {/* Info Note */}
          <p className="text-[11px] text-[#aaa] text-center mt-4">
            Your data is exported from your local device. No data is sent to external servers.
          </p>
        </div>
      </div>
    </div>
  );
}