import React, { useRef, useState } from 'react'
import { PipelineProgress } from './PipelineProgress'
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
    <div className="w-full space-y-5">
      {activeFileName && (
        <div className="p-4 bg-[#121626]/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold text-lg shadow-inner">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm tracking-tight">{activeFileName}</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Active Dataset
                </span>
              </div>
              <span className="text-xs text-zinc-400">Ready for data quality inspection and exploratory analysis</span>
            </div>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
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
        className={`group relative flex flex-col items-center justify-center p-8 sm:p-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-xl shadow-2xl ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/5'
            : isDragOver
            ? 'border-indigo-500 bg-indigo-500/12 shadow-indigo-500/20 scale-[1.008]'
            : 'border-white/15 hover:border-indigo-500/60 bg-[#121626]/40 hover:bg-[#161a30]/60 shadow-black/30'
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

        {/* Floating Upload Icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-lg shadow-indigo-500/20">
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
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-500/40">
            +
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5 group-hover:text-indigo-400 transition-colors tracking-tight">
          Upload Dataset for Multi-Agent BI
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 text-center max-w-sm mb-5 leading-relaxed">
          Drag & drop your CSV or Excel spreadsheet here, or click to browse files
        </p>

        {/* Supported Formats */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-white/5 text-zinc-400 border border-white/10">
            .CSV
          </span>
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-white/5 text-zinc-400 border border-white/10">
            .XLSX
          </span>
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-white/5 text-zinc-400 border border-white/10">
            .XLS
          </span>
        </div>

        {disabled && (
          <div className="absolute inset-0 bg-[#07080c]/80 backdrop-blur-md rounded-2xl flex items-center justify-center z-10">
            <div className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#121626]/90 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <span className="text-xs font-semibold text-white">
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
