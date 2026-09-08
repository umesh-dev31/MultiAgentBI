import React, { useRef, useState } from 'react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  disabled = false,
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
      validateAndUpload(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0])
    }
    // reset input so the same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateAndUpload = (file: File) => {
    onFileUpload(file)
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-md ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-700 bg-slate-900/40'
            : isDragOver
            ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/10 scale-[1.005]'
            : 'border-slate-700 hover:border-indigo-500/70 bg-slate-900/60 hover:bg-slate-900/90 shadow-lg shadow-black/20'
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

        {/* Upload Icon with badge glow */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-300 shadow-inner">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md">
            +
          </div>
        </div>

        {/* Primary prompt */}
        <div className="text-center space-y-2 max-w-md">
          <p className="text-base sm:text-lg font-semibold text-slate-100">
            {isDragOver ? (
              <span className="text-indigo-400">Drop dataset here to begin processing</span>
            ) : (
              <>
                <span className="text-indigo-400 underline decoration-indigo-400/50 underline-offset-4 group-hover:text-indigo-300">
                  Click to browse
                </span>{' '}
                or drag and drop your dataset
              </>
            )}
          </p>
          <p className="text-xs sm:text-sm text-slate-400">
            Supported formats: <span className="text-slate-300 font-mono font-medium">.CSV</span>,{' '}
            <span className="text-slate-300 font-mono font-medium">.XLSX</span>, or{' '}
            <span className="text-slate-300 font-mono font-medium">.XLS</span>
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Auto Type Inference
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Missing Value Imputation
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Deduplication
          </span>
        </div>
      </div>
    </div>
  )
}
