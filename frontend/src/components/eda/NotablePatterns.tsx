import React from 'react'

interface NotablePatternsProps {
  patterns: string[]
}

export const NotablePatterns: React.FC<NotablePatternsProps> = ({ patterns }) => {
  if (!patterns || patterns.length === 0) {
    return null
  }

  return (
    <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3 text-indigo-700">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h4 className="font-bold text-sm sm:text-base text-slate-900">
          Notable Patterns & Key Business Highlights
        </h4>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-800 font-medium">
        {patterns.map((pattern, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
            <span className="leading-relaxed">{pattern}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
