import React from 'react'
import type { CleanedRecord, ColumnInfo } from '../../types/data'

interface CleanedDataPreviewProps {
  records: CleanedRecord[]
  columns: ColumnInfo[]
  totalCleanedRows: number
}

export const CleanedDataPreview: React.FC<CleanedDataPreviewProps> = ({
  records,
  columns,
  totalCleanedRows,
}) => {
  if (!records || records.length === 0) {
    return (
      <div className="w-full p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
        No preview records available.
      </div>
    )
  }

  const columnNames = columns.map((col) => col.name)

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Cleaned Data Preview
          </h3>
          <p className="text-xs text-slate-500">
            First {records.length} records after safe auto-fixes and imputation
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          Showing {records.length} of {totalCleanedRows} rows
        </span>
      </div>

      <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs shadow-xs border-b border-slate-200">
            <tr className="text-slate-700 font-semibold">
              <th className="py-3 px-4 w-12 text-center text-xs font-mono">#</th>
              {columnNames.map((col) => (
                <th key={col} className="py-3 px-4 font-mono font-bold text-slate-800">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans bg-white">
            {records.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 px-4 text-center font-mono text-slate-400 text-xs bg-slate-50/50">
                  {rowIndex + 1}
                </td>
                {columnNames.map((col) => {
                  const val = row[col]
                  const isNull = val === null || val === undefined
                  return (
                    <td
                      key={col}
                      className="py-2.5 px-4 text-slate-800 font-mono whitespace-nowrap text-xs sm:text-sm font-medium"
                    >
                      {isNull ? (
                        <span className="text-slate-400 italic">null</span>
                      ) : typeof val === 'number' ? (
                        <span className="text-cyan-800 font-semibold">
                          {Number.isInteger(val) ? val : val.toFixed(2)}
                        </span>
                      ) : typeof val === 'boolean' ? (
                        <span className={`px-1.5 py-0.5 rounded font-bold text-xs ${val ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                          {String(val)}
                        </span>
                      ) : (
                        <span className="text-slate-900">{String(val)}</span>
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
