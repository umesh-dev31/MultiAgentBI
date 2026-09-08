import React from 'react'

export const ExampleQuestions = ({ onSelectQuestion, disabled = false }) => {
  const examples = [
    {
      title: 'Total revenue by region',
      description: 'Aggregates sales performance geographically',
      icon: '🗺️',
    },
    {
      title: 'Top 5 customers by order count',
      description: 'Identifies highest volume repeat buyers',
      icon: '🏆',
    },
    {
      title: 'Average unit price and total quantity by product',
      description: 'Compares pricing and volume distribution across catalog',
      icon: '📦',
    },
    {
      title: 'Total revenue and order count by region ordered by revenue desc',
      description: 'Ranked regional market revenue breakdown',
      icon: '📊',
    },
  ]

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span>Suggested Business Questions</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {examples.map((ex, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onSelectQuestion(ex.title)}
            className="flex flex-col text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group shadow-xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base group-hover:scale-110 transition-transform">
                {ex.icon}
              </span>
              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {ex.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2">
              {ex.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
