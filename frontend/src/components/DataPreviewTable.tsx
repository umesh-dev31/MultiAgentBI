import React from 'react'
import type { CleanedRecord, ColumnInfo } from '../types/data'

interface DataPreviewTableProps {
  records: CleanedRecord[]
  columns: ColumnInfo[]
  totalCleanedRows: number
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({
  records,
  columns,
  totalCleanedRows,
}) => {
  if (!records || records.length === 0) {
    return (
      <div className="w-full p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-sm">
        No preview records available.
      </div>
    )
  }

  const columnNames = columns.map((col) => col.name)

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-200">
            Cleaned Data Preview
          </h3>
          <p className="text-xs text-slate-400">
            First {records.length} records after deduplication and missing value imputation
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          Showing {records.length} of {totalCleanedRows} rows
        </span>
      </div>

      <div className="overflow-x-auto max-h-[420px] scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm shadow-sm">
            <tr className="border-b border-slate-800 text-slate-400 font-medium">
              <th className="py-3 px-4 w-12 text-center text-xs font-mono">#</th>
              {columnNames.map((col) => (
                <th key={col} className="py-3 px-4 font-mono font-medium text-slate-300">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-sans">
            {records.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-2.5 px-4 text-center font-mono text-slate-500 text-xs bg-slate-950/30">
                  {rowIndex + 1}
                </td>
                {columnNames.map((col) => {
                  const val = row[col]
                  const isNull = val === null || val === undefined
                  return (
                    <td
                      key={col}
                      className="py-2.5 px-4 text-slate-200 font-mono whitespace-nowrap text-xs sm:text-sm"
                    >
                      {isNull ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : typeof val === 'number' ? (
                        <span className="text-cyan-300">
                          {Number.isInteger(val) ? val : val.toFixed(2)}
                        </span>
                      ) : typeof val === 'boolean' ? (
                        <span className={val ? 'text-emerald-400' : 'text-rose-400'}>
                          {String(val)}
                        </span>
                      ) : (
                        <span>{String(val)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
