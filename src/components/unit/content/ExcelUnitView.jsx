import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, BarChart3, Table, Grid3x3 } from 'lucide-react';
import { excelParserService } from '../../../services/ExcelParserService';
import AgentOverlay from '../../AgentOverlay';
import { useAgentOverlay } from '../../../hooks/useAgentOverlay';

// Import extracted hooks and components
import useExcelExport from './ExcelUnitView/hooks/useExcelExport';
import usePDFExport from './ExcelUnitView/hooks/usePDFExport';
import useNormalization from './ExcelUnitView/hooks/useNormalization';
import useAIDescriptions from './ExcelUnitView/hooks/useAIDescriptions';
import TableView from './ExcelUnitView/components/TableView';
import StatsView from './ExcelUnitView/components/StatsView';
import ExportControls from './ExcelUnitView/components/ExportControls';

const ExcelUnitView = ({ content }) => {
  // Core state
  const [parsedData, setParsedData] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'stats'
  const [maxRows, setMaxRows] = useState(50); // Limit za Unit view
  const [error, setError] = useState(null);

  // Agent Overlay hook
  const { isActive: agentActive, agentInput, targetComponent, endpoint, hideAgent } = useAgentOverlay();

  // Use extracted hooks
  const {
    isNormalizing,
    normalizedData,
    diffMeta,
    normalizedXlsxUrl,
    updatedRows,
    setUpdatedRows,
    onNormalize
  } = useNormalization(parsedData, activeSheet, setError);

  const {
    activeDescriptionRow,
    aiSuggestions,
    isLoadingSuggestions,
    updatedDescriptions,
    handleDescriptionClick,
    handleSuggestionSelect,
    handleDescriptionAgentClick
  } = useAIDescriptions();

  const { handlePrint, handleExportExcel } = useExcelExport(
    parsedData,
    activeSheet,
    maxRows,
    updatedRows,
    normalizedData,
    setError
  );

  const { handleExportPDF } = usePDFExport(
    parsedData,
    activeSheet,
    maxRows,
    updatedRows,
    normalizedData,
    setError
  );

  // Handle row number click
  const handleRowNumberClick = (displayRowIndex, rowData) => {
    console.log(`🎯 Clicked row ${displayRowIndex}:`, rowData);

    // Prepare row data for copying to right unit
    const rowForCopy = {
      rowIndex: displayRowIndex,
      originalRowData: rowData,
      rowCells: rowData.cells,
      headers: parsedData ? parsedData.sheets[activeSheet]?.formattedData?.headers : [],
      timestamp: new Date().toISOString(),
      sourceSheet: activeSheet,
      sourceFile: parsedData?.fileName
    };

    // Dispatch event to communicate with right unit
    window.dispatchEvent(new CustomEvent('excel-row-selected', {
      detail: rowForCopy
    }));

    console.log(`📋 Row ${displayRowIndex} prepared for copying to right unit:`, rowForCopy);
  };

  // Listen for row updates from right unit
  useEffect(() => {
    const handleRowUpdate = (event) => {
      const { rowIndex, updatedRowData, updatedValues } = event.detail;
      console.log(`📝 Received row update for row ${rowIndex}:`, updatedValues);

      setUpdatedRows(prev => ({
        ...prev,
        [rowIndex]: updatedRowData
      }));
    };

    const handleAgentSuggestion = (event) => {
      const { suggestion, originalInput } = event.detail;
      console.log(`🤖 Agent suggestion received:`, suggestion);

      // Find the active description row and update it
      if (activeDescriptionRow) {
        const [rowIndex, cellIndex] = activeDescriptionRow.split('-').map(Number);
        const key = `${rowIndex}-${cellIndex}`;

        setUpdatedDescriptions(prev => ({
          ...prev,
          [key]: suggestion.description
        }));
      }

      hideAgent(); // Close agent overlay
    };

    window.addEventListener('excel-row-updated', handleRowUpdate);
    window.addEventListener('agent-suggestion-selected', handleAgentSuggestion);

    return () => {
      window.removeEventListener('excel-row-updated', handleRowUpdate);
      window.removeEventListener('agent-suggestion-selected', handleAgentSuggestion);
    };
  }, [activeDescriptionRow, hideAgent, setUpdatedRows]);

  // Parse Excel file when content changes
  useEffect(() => {
    if (!content) {
      setParsedData(null);
      return;
    }

    const parseFile = async () => {
      setIsParsing(true);
      setError(null);

      try {
        console.log('📊 Unit Excel: Parsing file:', content.name);
        const parsed = await excelParserService.parseExcelFile(content);
        parsed.stats = excelParserService.getFileStatistics(parsed);

        setParsedData(parsed);
        setActiveSheet(parsed.defaultSheet);
        console.log('✅ Unit Excel: Parsed successfully:', parsed);

      } catch (err) {
        console.error('❌ Unit Excel: Parsing failed:', err);
        setError(err.message);
        setParsedData(null);
      } finally {
        setIsParsing(false);
      }
    };

    if (content && typeof content === 'object' && content.name) {
      parseFile();
    }
  }, [content]);

  // Loading state
  if (isParsing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-xs">Parsing Excel...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <FileSpreadsheet size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Failed to parse Excel</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!parsedData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Grid3x3 size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">No Excel data</p>
        </div>
      </div>
    );
  }

  const currentSheetData = activeSheet ? parsedData.sheets[activeSheet] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet size={16} className="text-green-600" />
          <span className="text-xs font-medium">Excel</span>
          <span className="text-xs text-slate-500">
            {parsedData.fileName.length > 12 ? `${parsedData.fileName.substring(0, 12)}...` : parsedData.fileName}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-2">
        {parsedData.sheetNames.length > 1 && (
          <select
            value={activeSheet || ''}
            onChange={(e) => setActiveSheet(e.target.value)}
            className="text-xs border border-slate-300 rounded px-1 py-0.5 bg-white"
          >
            {parsedData.sheetNames.map(sheetName => (
              <option key={sheetName} value={sheetName}>
                {sheetName.length > 10 ? `${sheetName.substring(0, 10)}...` : sheetName}
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('table')}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table size={10} />
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              viewMode === 'stats' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={10} />
          </button>

          {/* Export Controls */}
          <div className="mx-1 h-3 w-px bg-slate-300"></div>
          <ExportControls
            parsedData={parsedData}
            normalizedData={normalizedData}
            normalizedXlsxUrl={normalizedXlsxUrl}
            isNormalizing={isNormalizing}
            onNormalize={onNormalize}
            handleExportExcel={handleExportExcel}
            handleExportPDF={handleExportPDF}
            handlePrint={handlePrint}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Normalization Status */}
      {normalizedData && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
          <strong>Normalization Complete:</strong> {Object.keys(updatedRows).length} rows ready for review
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden border border-slate-300 rounded bg-white relative">
        <div className="h-full p-1 overflow-auto">
          {viewMode === 'table' && (
            <TableView
              currentSheetData={currentSheetData}
              maxRows={maxRows}
              setMaxRows={setMaxRows}
              updatedRows={updatedRows}
              diffMeta={diffMeta}
              updatedDescriptions={updatedDescriptions}
              activeDescriptionRow={activeDescriptionRow}
              handleRowNumberClick={handleRowNumberClick}
              handleDescriptionAgentClick={handleDescriptionAgentClick}
            />
          )}
          {viewMode === 'stats' && (
            <StatsView
              parsedData={parsedData}
              currentSheetData={currentSheetData}
              activeSheet={activeSheet}
            />
          )}
        </div>

        {/* Agent Overlay */}
        <AgentOverlay
          isActive={agentActive}
          onClose={hideAgent}
          input={agentInput}
          endpoint={endpoint}
          targetComponent={targetComponent}
        />
      </div>
    </div>
  );
};

export default ExcelUnitView;