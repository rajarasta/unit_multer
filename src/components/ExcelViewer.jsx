import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Table, Download, FileSpreadsheet, Eye, BarChart3, Grid3x3, ChevronDown, ChevronRight } from 'lucide-react';

const ExcelViewer = ({ parsedData, onExport, onAnalyze }) => {
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'statistics', 'raw'
  const [maxRows, setMaxRows] = useState(100); // Limit za performance
  
  useEffect(() => {
    if (parsedData && parsedData.defaultSheet) {
      setActiveSheet(parsedData.defaultSheet);
    }
  }, [parsedData]);
  
  if (!parsedData) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nema Excel podataka</p>
        </div>
      </div>
    );
  }
  
  const currentSheetData = activeSheet ? parsedData.sheets[activeSheet] : null;
  const stats = parsedData.stats || null;
  
  const renderTableView = () => {
    if (!currentSheetData || !currentSheetData.formattedData.headers) {
      return (
        <div className="text-center py-8 text-slate-500">
          <Grid3x3 size={32} className="mx-auto mb-2 opacity-50" />
          <p>Sheet nema podataka</p>
        </div>
      );
    }
    
    const { headers, rows } = currentSheetData.formattedData;
    const displayRows = rows.slice(0, maxRows);
    
    return (
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="border border-slate-300 px-2 py-1 text-left font-medium text-slate-600 w-8">#</th>
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  className="border border-slate-300 px-2 py-1 text-left font-medium text-slate-600 min-w-16"
                  title={header.name}
                >
                  {header.name.length > 12 ? `${header.name.substring(0, 12)}...` : header.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                <td className="border border-slate-300 px-2 py-1 bg-slate-50 text-slate-500 font-mono">
                  {row.rowIndex}
                </td>
                {headers.map((header, cellIndex) => {
                  const cell = row.cells[cellIndex];
                  const value = cell ? cell.value : '';
                  return (
                    <td 
                      key={cellIndex} 
                      className="border border-slate-300 px-2 py-1 text-slate-700"
                      title={String(value)}
                    >
                      {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {rows.length > maxRows && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setMaxRows(prev => prev + 100)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Load More ({rows.length - maxRows} more rows)
            </button>
          </div>
        )}
      </div>
    );
  };
  
  const renderStatistics = () => {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 rounded p-3">
          <h4 className="font-medium text-slate-700 mb-2">File Info</h4>
          <div className="text-xs space-y-1">
            <div>📄 <strong>File:</strong> {parsedData.fileName}</div>
            <div>📊 <strong>Size:</strong> {(parsedData.fileSize / 1024).toFixed(1)} KB</div>
            <div>📋 <strong>Sheets:</strong> {parsedData.sheetNames.length}</div>
          </div>
        </div>
        
        {currentSheetData && (
          <div className="bg-slate-50 rounded p-3">
            <h4 className="font-medium text-slate-700 mb-2">Sheet: {activeSheet}</h4>
            <div className="text-xs space-y-1">
              <div>📏 <strong>Rows:</strong> {currentSheetData.rowCount}</div>
              <div>📐 <strong>Columns:</strong> {currentSheetData.colCount}</div>
              <div>🔢 <strong>Data Cells:</strong> {
                currentSheetData.formattedData.rows.reduce((count, row) => {
                  return count + row.cells.filter(cell => cell.value && cell.value.toString().trim() !== '').length;
                }, 0)
              }</div>
            </div>
          </div>
        )}
        
        <div className="bg-slate-50 rounded p-3">
          <h4 className="font-medium text-slate-700 mb-2">Available Sheets</h4>
          <div className="space-y-1">
            {parsedData.sheetNames.map((sheetName, index) => (
              <div key={index} className="text-xs flex items-center justify-between">
                <span>{sheetName}</span>
                <span className="text-slate-500">
                  {parsedData.sheets[sheetName]?.rowCount || 0} rows
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-green-600" />
          <div>
            <h3 className="font-semibold text-slate-700 text-sm">Excel Viewer</h3>
            <p className="text-xs text-slate-500">{parsedData.fileName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAnalyze && onAnalyze(parsedData)}
            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Analyze with AI"
          >
            <BarChart3 size={14} />
          </button>
          <button
            onClick={() => onExport && onExport(parsedData)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Export"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      
      {/* Sheet Selector & View Mode */}
      <div className="flex items-center justify-between mb-3">
        {parsedData.sheetNames.length > 1 && (
          <select 
            value={activeSheet || ''} 
            onChange={(e) => setActiveSheet(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
          >
            {parsedData.sheetNames.map(sheetName => (
              <option key={sheetName} value={sheetName}>
                {sheetName}
              </option>
            ))}
          </select>
        )}
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table size={12} className="inline mr-1" />
            Table
          </button>
          <button
            onClick={() => setViewMode('statistics')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === 'statistics' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={12} className="inline mr-1" />
            Stats
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden border border-slate-300 rounded bg-white">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full p-2"
        >
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'statistics' && renderStatistics()}
        </motion.div>
      </div>
    </div>
  );
};

export default ExcelViewer;