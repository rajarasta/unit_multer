import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, BarChart3, Table, Grid3x3 } from 'lucide-react';
import { excelParserService } from '../../../services/ExcelParserService';

const ExcelUnitView = ({ content }) => {
  const [parsedData, setParsedData] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'stats'
  const [maxRows, setMaxRows] = useState(50); // Limit za Unit view
  const [error, setError] = useState(null);
  
  // AI Description suggestion states
  const [activeDescriptionRow, setActiveDescriptionRow] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [updatedDescriptions, setUpdatedDescriptions] = useState({});
  const [updatedRows, setUpdatedRows] = useState({});
  
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

  // Handle description click for AI suggestions
  const handleDescriptionClick = async (rowIndex, cellIndex, description) => {
    console.log(`💭 Clicked description in row ${rowIndex}:`, description);
    
    if (!description || description.toString().trim() === '') {
      return;
    }

    const rowKey = `${rowIndex}-${cellIndex}`;
    
    // Toggle suggestions if clicking same description
    if (activeDescriptionRow === rowKey) {
      setActiveDescriptionRow(null);
      setAiSuggestions([]);
      return;
    }

    setActiveDescriptionRow(rowKey);
    setIsLoadingSuggestions(true);
    setAiSuggestions([]);

    try {
      // Call AI service for description suggestions
      const suggestions = await getDescriptionSuggestions(description.toString());
      setAiSuggestions(suggestions);
    } catch (err) {
      console.error('❌ Failed to get AI suggestions:', err);
      setAiSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // AI service call function
  const getDescriptionSuggestions = async (description) => {
    // This will use the specified model: 11.settings.chatgpt.openai.20.boss
    const prompt = `Analiziraj ovaj opis iz troškovnika: "${description}"

Istraži šta ovaj opis znači i predloži 3 bolja opisa koji bi bili:
1. Jasniji i precizniji
2. Više tehnički specificni
3. Lakši za razumijevanje

Vrati samo 3 prijedloga, svaki u novom redu, bez dodatnih objašnjenja.`;

    const response = await fetch('/api/llm/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        model: '11.settings.chatgpt.openai.20.boss',
        context: {
          type: 'description_analysis',
          original_description: description
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Parse the suggestions from the response
    const suggestions = result.response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.length > 0)
      .slice(0, 3); // Take only first 3 suggestions

    return suggestions;
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    if (!activeDescriptionRow) return;

    const [rowIndex, cellIndex] = activeDescriptionRow.split('-').map(Number);
    const key = `${rowIndex}-${cellIndex}`;
    
    setUpdatedDescriptions(prev => ({
      ...prev,
      [key]: suggestion
    }));

    // Clear active suggestions
    setActiveDescriptionRow(null);
    setAiSuggestions([]);
    
    console.log(`✅ Updated description for row ${rowIndex}, cell ${cellIndex}:`, suggestion);
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

    window.addEventListener('excel-row-updated', handleRowUpdate);
    
    return () => {
      window.removeEventListener('excel-row-updated', handleRowUpdate);
    };
  }, []);

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

  const renderTableView = () => {
    if (!currentSheetData || !currentSheetData.formattedData.headers) {
      return (
        <div className="text-center py-4 text-slate-500">
          <p className="text-xs">No data in sheet</p>
        </div>
      );
    }

    const { headers, rows } = currentSheetData.formattedData;
    const displayRows = rows.slice(0, maxRows);

    return (
      <div className="overflow-auto">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              {headers.map((header, index) => {
                // Define column widths based on typical BoQ structure
                // Ratio 1:10:1:1:1:1 where index 0=rb, 1=opis, 2=jed, 3=kol, 4=cijena, 5=iznos
                const getColumnWidth = (index) => {
                  const totalCols = headers.length;
                  if (totalCols <= 7) {
                    // Standard BoQ structure: Redni broj, Opis, Jedinica, Količina, Cijena, Iznos
                    switch (index) {
                      case 0: return 'w-10'; // Redni broj (1 part)
                      case 1: return 'w-auto'; // Opis (10 parts - auto takes remaining space)
                      case 2: return 'w-12'; // Jedinica (uže)
                      case 3: return 'w-16'; // Količina (uže)
                      case 4: return 'w-20'; // Jedinična cijena (uže)
                      case 5: return 'w-20'; // Ukupni iznos (uže)
                      default: return 'w-16';
                    }
                  } else {
                    // More columns - distribute more evenly
                    if (index === 1 || header.name.toLowerCase().includes('opis') || header.name.toLowerCase().includes('description')) {
                      return 'w-auto'; // Description column gets auto width
                    }
                    return 'w-16'; // Other columns get smaller fixed width
                  }
                };
                
                return (
                  <th 
                    key={index} 
                    className={`border border-slate-300 px-1 py-0.5 text-left font-medium text-slate-600 text-xs ${getColumnWidth(index)}`}
                    title={header.name}
                  >
                    {header.name.length > 12 ? `${header.name.substring(0, 12)}...` : header.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => {
              // Check if this row has been updated from the right unit
              const updatedRow = updatedRows[rowIndex];
              const actualRow = updatedRow || row;
              
              // Safety check for cells array
              if (!actualRow || !actualRow.cells || !Array.isArray(actualRow.cells)) {
                return null;
              }
              
              return (
                <tr key={rowIndex} className={`hover:bg-slate-50 ${updatedRow ? 'bg-green-50' : ''}`}>
                  {headers.map((header, cellIndex) => {
                    // Additional safety check for header
                    if (!header || cellIndex >= actualRow.cells.length) {
                      return (
                        <td key={cellIndex} className="border border-slate-300 px-1 py-0.5 text-xs">
                          <span className="text-slate-400">-</span>
                        </td>
                      );
                    }
                    
                    const cell = actualRow.cells[cellIndex];
                    const value = cell ? cell.value : '';
                  
                  // Adjust text truncation based on column type
                  const getTextLength = (index) => {
                    const totalCols = headers.length;
                    if (totalCols <= 7) {
                      switch (index) {
                        case 0: return 6;   // Redni broj - vrlo kratki
                        case 1: return null; // Opis - cijeli tekst (no truncation)
                        case 2: return 6;   // Jedinica - vrlo kratki
                        case 3: return 8;   // Količina - kratki
                        case 4: return 10;  // Cijena - kratki
                        case 5: return 10;  // Iznos - kratki
                        default: return 8;
                      }
                    } else {
                      // More columns
                      if (index === 1 || header.name.toLowerCase().includes('opis') || header.name.toLowerCase().includes('description')) {
                        return null; // Description - cijeli tekst
                      }
                      return 8; // Other columns get shorter text
                    }
                  };
                  
                  const maxLength = getTextLength(cellIndex);
                  const displayValue = maxLength === null ? 
                    String(value) : // Show full text for description columns
                    (String(value).length > maxLength ? 
                      `${String(value).substring(0, maxLength)}...` : 
                      String(value));
                  
                  // Column type detection
                  const isRowNumberColumn = cellIndex === 0;
                  const isDescriptionColumn = maxLength === null; // Description columns show full text
                  const rowKey = `${rowIndex}-${cellIndex}`;
                  const hasUpdatedDescription = updatedDescriptions[rowKey];
                  const isActiveDescription = activeDescriptionRow === rowKey;
                  
                  return (
                    <td
                      key={cellIndex}
                      className={`border border-slate-300 px-1 py-0.5 text-xs min-h-8 ${(isRowNumberColumn || isDescriptionColumn) ? 'align-top' : 'align-bottom'} ${
                        isDescriptionColumn ? 'break-words' : 'overflow-hidden'
                      } ${
                        isRowNumberColumn
                          ? 'text-blue-600 cursor-pointer hover:text-blue-800 hover:bg-blue-50 font-medium'
                          : 'text-slate-700'
                      } ${
                        isActiveDescription ? 'bg-purple-100 ring-2 ring-purple-300' : ''
                      } ${
                        hasUpdatedDescription ? 'bg-green-50 border-green-300' : ''
                      } ${
                        updatedRow ? 'border-green-400' : ''
                      }`}
                      title={String(value)}
                      onClick={
                        isRowNumberColumn 
                          ? () => handleRowNumberClick(rowIndex, actualRow)
                          : undefined
                      }
                    >
                      {isRowNumberColumn ? (
                        <div className="text-xs font-medium text-blue-600 leading-tight">
                          {displayValue}
                        </div>
                      ) : isDescriptionColumn ? (
                        <div className="text-xs leading-tight">
                          <div className={`break-words ${hasUpdatedDescription ? 'text-green-700 font-medium' : 'text-slate-700'}`}>
                            {hasUpdatedDescription ? updatedDescriptions[rowKey] : displayValue}
                          </div>
                          {hasUpdatedDescription && (
                            <div className="text-xs text-green-600 mt-1 italic">
                              (AI poboljšano)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-end items-end">
                          <span className="text-xs text-slate-700">
                            {displayValue}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {rows.length > maxRows && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setMaxRows(prev => prev + 25)}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              +{Math.min(25, rows.length - maxRows)} rows
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderStatsView = () => {
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden border border-slate-300 rounded bg-white">
        <div className="h-full p-1 overflow-auto">
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'stats' && renderStatsView()}
        </div>
      </div>
    </div>
  );
};

export default ExcelUnitView;




