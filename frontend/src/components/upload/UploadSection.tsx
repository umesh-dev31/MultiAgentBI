import React, { useRef, useState } from 'react'
import { PipelineProgress } from './PipelineProgress'
import { useTheme } from '../../context/ThemeContext'
import type { PipelineExecutionLog } from '../../types/data'

interface UploadSectionProps {
  onFileUpload: (file: File) => void
  disabled?: boolean
  activeFileName?: string
  onReset?: () => void
  isExecutingPipeline?: boolean
  pipelineLogs?: PipelineExecutionLog[]
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileUpload,
  disabled = false,
  activeFileName,
  onReset,
  isExecutingPipeline = false,
  pipelineLogs,
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
    <div className="w-full space-y-6">
      {activeFileName && (
        <div className={`p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-colors ${
          isDark
            ? 'bg-black border-white/15'
            : 'bg-white border-black/10 shadow-sm'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded border flex items-center justify-center font-mono font-bold text-xs ${
              isDark
                ? 'border-white/25 bg-white/[0.05] text-white'
                : 'border-black/20 bg-black/[0.04] text-neutral-900'
            }`}>
              CSV
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  {activeFileName}
                </span>
                <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                  isDark
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-black/15 bg-black/[0.05] text-neutral-800'
                }`}>
                  Active Dataset
                </span>
              </div>
              <span className={`text-xs ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
                Verified single source of truth for all six downstream agents
              </span>
            </div>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all cursor-pointer ${
                isDark
                  ? 'text-white bg-white/[0.06] hover:bg-white/[0.12] border-white/20'
                  : 'text-neutral-800 bg-black/[0.04] hover:bg-black/[0.08] border-black/15'
              }`}
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

        {/* Minimalist Upload Glyph */}
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

        <h3 className={`text-base sm:text-lg font-bold mb-1.5 tracking-tight ${
          isDark ? 'text-white' : 'text-neutral-900'
        }`}>
          Upload Dataset for Multi-Agent BI
        </h3>
        <p className={`text-xs sm:text-sm text-center max-w-sm mb-6 leading-relaxed ${
          isDark ? 'text-white/60' : 'text-neutral-500'
        }`}>
          Drag & drop your CSV or Excel spreadsheet here, or click to browse files
        </p>

        {/* Supported Formats */}
        <div className="flex items-center gap-2">
          {['.CSV', '.XLSX', '.XLS'].map(fmt => (
            <span
              key={fmt}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded border ${
                isDark
                  ? 'bg-white/[0.05] text-white/80 border-white/15'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
              }`}
            >
              {fmt}
            </span>
          ))}
        </div>

        {disabled && (
          <div className={`absolute inset-0 rounded-xl flex items-center justify-center z-10 ${
            isDark ? 'bg-black/85' : 'bg-white/85 backdrop-blur-xs'
          }`}>
            <div className={`flex items-center gap-3 px-6 py-3 rounded-lg border shadow-lg ${
              isDark ? 'bg-black border-white/30 text-white' : 'bg-white border-neutral-300 text-neutral-900'
            }`}>
              <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${
                isDark ? 'border-white' : 'border-neutral-900'
              }`} />
              <span className="text-xs font-semibold font-mono">
                Executing LangGraph Multi-Agent Pipeline...
              </span>
            </div>
          </div>
        )}
      </div>

      {(isExecutingPipeline || (pipelineLogs && pipelineLogs.length > 0)) && (
        <PipelineProgress
          isExecuting={isExecutingPipeline}
          logs={pipelineLogs}
          fileName={activeFileName}
        />
      )}
    </div>
  )
}

export default UploadSection
