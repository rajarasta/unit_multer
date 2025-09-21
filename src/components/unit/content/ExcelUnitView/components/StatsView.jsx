import React from 'react';

const StatsView = ({ parsedData, currentSheetData, activeSheet }) => {
  return (
    <div className="space-y-2 text-xs">
      <div className="bg-slate-50 rounded p-2">
        <div className="font-medium text-slate-700 mb-1">File</div>
        <div className="space-y-0.5 text-slate-600">
          <div>📄 {parsedData.fileName}</div>
          <div>📊 {(parsedData.fileSize / 1024).toFixed(1)} KB</div>
          <div>📋 {parsedData.sheetNames.length} sheets</div>
        </div>
      </div>

      {currentSheetData && (
        <div className="bg-slate-50 rounded p-2">
          <div className="font-medium text-slate-700 mb-1">{activeSheet}</div>
          <div className="space-y-0.5 text-slate-600">
            <div>📏 {currentSheetData.rowCount} rows</div>
            <div>📐 {currentSheetData.colCount} columns</div>
            <div>🔢 {
              currentSheetData.formattedData.rows.reduce((count, row) => {
                return count + row.cells.filter(cell => cell.value && cell.value.toString().trim() !== '').length;
              }, 0)
            } cells</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsView;