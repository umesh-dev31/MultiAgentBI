import React, { useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  disabled = false,
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
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
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-14 border border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          disabled
            ? (isDark ? 'opacity-40 cursor-not-allowed border-white/10 bg-black' : 'opacity-40 cursor-not-allowed border-neutral-300 bg-neutral-100')
            : isDragOver
            ? (isDark ? 'border-white bg-white/[0.08] shadow-[0_0_40px_rgba(255,255,255,0.1)] scale-[1.005]' : 'border-neutral-900 bg-neutral-100 shadow-md scale-[1.005]')
            : (isDark
                ? 'border-white/20 hover:border-white/50 bg-black hover:bg-white/[0.03]'
                : 'border-neutral-300 hover:border-neutral-600 bg-white hover:bg-neutral-50 shadow-sm')
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

        {/* Minimalist Upload Icon */}
        <div className="mb-4">
          <div className={`w-14 h-14 rounded-lg border flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'border-white/30 bg-white/[0.05] text-white group-hover:border-white/60 group-hover:scale-105'
              : 'border-neutral-300 bg-neutral-50 text-neutral-800 group-hover:border-neutral-500 group-hover:scale-105 group-hover:bg-neutral-100'
          }`}>
            <svg
              className="w-7 h-7"
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
        </div>

        {/* Primary prompt */}
        <div className="text-center space-y-2 max-w-md">
          <p className={`text-base sm:text-lg font-bold ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}>
            {isDragOver ? (
              <span>Drop dataset here to begin pipeline</span>
            ) : (
              <>
                <span className={`underline underline-offset-4 ${isDark ? 'text-white decoration-white/40' : 'text-neutral-900 decoration-neutral-400'}`}>
                  Click to browse
                </span>{' '}
                or drag and drop your dataset
              </>
            )}
          </p>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
            Supported formats: <span className="font-mono font-medium">.CSV</span>,{' '}
            <span className="font-mono font-medium">.XLSX</span>, or{' '}
            <span className="font-mono font-medium">.XLS</span>
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
          {['Auto Type Inference', 'Category-Aware Imputation', 'Deterministic Deduplication'].map(feat => (
            <span
              key={feat}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border ${
                isDark
                  ? 'border-white/15 bg-white/[0.03] text-white/70'
                  : 'border-neutral-200 bg-neutral-100 text-neutral-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white' : 'bg-neutral-900'}`} />
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FileUpload
