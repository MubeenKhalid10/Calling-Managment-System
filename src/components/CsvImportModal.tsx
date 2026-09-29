import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import {
  analyzeRawFile,
  executeImportWithDeduplication,
  RawFileAnalysis,
  FieldMapping,
} from '../utils/fileImportHelper';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
  Users,
  CopyCheck,
  FileText,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { leads, importLeads } = useCallingSystem();

  // Step 1: File selection | Step 2: Confirm Mapping | Step 3: Success
  const [step, setStep] = useState<'upload' | 'mapping' | 'success'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Analysis result
  const [analysis, setAnalysis] = useState<RawFileAnalysis | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({
    clientName: '',
    companyName: '',
    position: '',
    phoneNumber: '',
    region: '',
    email: '',
    latestComment: '',
    leadId: '',
  });

  // Duplicate preview counts
  const [importSummary, setImportSummary] = useState<{
    added: number;
    updated: number;
    total: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await analyzeRawFile(file);
      setAnalysis(res);
      setMapping(res.detectedMapping);

      // Pre-compute deduplication preview
      const preview = executeImportWithDeduplication({
        rawRows: res.rawRows,
        mapping: res.detectedMapping,
        existingLeads: leads,
      });

      setImportSummary({
        added: preview.addedLeads.length,
        updated: preview.updatedLeads.length,
        total: preview.totalImported,
      });

      setStep('mapping');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file. Please verify file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!analysis) return;

    setIsProcessing(true);
    try {
      const result = executeImportWithDeduplication({
        rawRows: analysis.rawRows,
        mapping,
        existingLeads: leads,
      });

      importLeads(result.addedLeads, result.updatedLeads);

      setImportSummary({
        added: result.addedLeads.length,
        updated: result.updatedLeads.length,
        total: result.totalImported,
      });

      setStep('success');

      setTimeout(() => {
        handleReset();
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving contacts.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setAnalysis(null);
    setErrorMsg(null);
    setImportSummary(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-2xl border border-neutral-300 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-neutral-800" />
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Import Contacts (CSV or Excel XLSX)
              </h2>
              <p className="text-[11px] text-neutral-500">
                Upload completely raw files. Columns and values are detected automatically.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 text-rose-950 rounded text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Upload File */}
          {step === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer bg-neutral-50/50 hover:bg-neutral-50 transition-all text-center block">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Upload className="w-10 h-10 text-neutral-400 mb-3" />
                <span className="text-sm font-bold text-neutral-800">
                  {isProcessing ? 'Analyzing Raw File...' : 'Click to select or drag CSV / XLSX file'}
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  Supports .csv, .xlsx, and .xls files of any format or column naming
                </span>
                <span className="mt-3 text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  Automatic Column &amp; Value Detection Active
                </span>
              </label>

              <div className="bg-neutral-50 border border-neutral-200 rounded p-3 text-xs text-neutral-600 space-y-1">
                <span className="font-semibold text-neutral-900 block">No pre-formatting needed:</span>
                <p>• Raw files with non-standard headers (e.g. &quot;Full Name&quot;, &quot;Mobile&quot;, &quot;Role&quot;) are auto-mapped.</p>
                <p>• Files with no headers are detected from values.</p>
                <p>• Duplicates are automatically detected by Phone, Email, or Name+Company and enriched without overwriting call history.</p>
              </div>
            </div>
          )}

          {/* STEP 2: Field Confirmation & Deduplication Preview */}
          {step === 'mapping' && analysis && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <span className="font-bold text-neutral-900 text-sm block">
                    Please confirm these fields
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    File: <code className="font-mono text-neutral-800">{analysis.fileName}</code> ({analysis.totalRows} records found)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Detected</span>
                </div>
              </div>

              {/* Deduplication Summary Notice */}
              {importSummary && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-blue-950 flex items-start gap-2.5">
                  <CopyCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Duplicate Detection Active:</span>
                    <p className="mt-0.5 leading-relaxed text-[11px]">
                      <strong>{importSummary.added}</strong> new contacts will be added with sequential Lead IDs.
                      {importSummary.updated > 0 && (
                        <span> <strong>{importSummary.updated}</strong> existing contacts matched by Phone/Email/Company will be enriched without creating duplicates or modifying their call history.</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Mapping Form */}
              <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3.5 rounded border border-neutral-200 max-h-60 overflow-y-auto">
                {/* Prospect Name */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Prospect Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.clientName}
                    onChange={(e) => setMapping({ ...mapping, clientName: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping.phoneNumber}
                    onChange={(e) => setMapping({ ...mapping, phoneNumber: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Company</label>
                  <select
                    value={mapping.companyName}
                    onChange={(e) => setMapping({ ...mapping, companyName: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- None / Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position / Job Title */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Position / Role</label>
                  <select
                    value={mapping.position}
                    onChange={(e) => setMapping({ ...mapping, position: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- None / Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Location / Region</label>
                  <select
                    value={mapping.region}
                    onChange={(e) => setMapping({ ...mapping, region: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- None / Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comments / Notes */}
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Previous Notes / Comments</label>
                  <select
                    value={mapping.latestComment}
                    onChange={(e) => setMapping({ ...mapping, latestComment: e.target.value })}
                    className="w-full py-1.5 px-2 border border-neutral-300 rounded bg-white text-xs"
                  >
                    <option value="">-- None / Select Column --</option>
                    {analysis.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample preview table */}
              <div>
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
                  First 2 sample rows from file:
                </span>
                <div className="bg-neutral-100 p-2 rounded text-[10px] font-mono overflow-x-auto max-h-24">
                  {analysis.sampleRows.slice(0, 2).map((r, i) => (
                    <div key={i} className="truncate border-b border-neutral-200/60 pb-1 mb-1 last:border-0">
                      Row {i + 1}: {Object.entries(r).map(([k, v]) => `${k}: "${v}"`).join(' | ')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded"
                >
                  Choose Different File
                </button>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded shadow-xs"
                >
                  <span>Confirm &amp; Import Contacts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Success Feedback */}
          {step === 'success' && importSummary && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-neutral-900">
                Contacts Successfully Processed!
              </h3>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                Added <strong>{importSummary.added}</strong> new contacts and enriched <strong>{importSummary.updated}</strong> existing records. Original raw fields preserved safely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
