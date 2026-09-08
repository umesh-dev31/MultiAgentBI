import React, { useRef, useState } from 'react'

interface UploadSectionProps {
  onFileUpload: (file: File) => void
  disabled?: boolean
  activeFileName?: string
  onReset?: () => void
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileUpload,
  disabled = false,
  activeFileName,
  onReset,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFileUpload(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full space-y-4">
      {activeFileName && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{activeFileName}</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Dataset
                </span>
              </div>
              <span className="text-xs text-slate-500">Ready for data quality inspection and exploratory analysis</span>
            </div>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              Upload Different File
            </button>
          )}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
            : isDragOver
            ? 'border-indigo-600 bg-indigo-50/50 shadow-md scale-[1.005]'
            : 'border-slate-300 hover:border-indigo-600 bg-white hover:bg-slate-50/60 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          id="file-upload-input"
        />

        {/* Upload Icon */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 shadow-sm">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
            +
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
          Upload Dataset for Multi-Agent BI
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 text-center max-w-sm mb-4">
          Drag & drop your CSV or Excel spreadsheet here, or click to browse files
        </p>

        {/* Supported Formats */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            .CSV
          </span>
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            .XLSX
          </span>
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            .XLS
          </span>
        </div>

        {disabled && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-2xl flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-md">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span className="text-xs font-medium text-slate-800">Processing & Ingesting Dataset...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
