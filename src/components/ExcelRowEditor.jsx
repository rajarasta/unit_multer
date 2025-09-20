import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

const ExcelRowEditor = ({ rowData, onSave, onCancel, onClose }) => {
  const [editableValues, setEditableValues] = useState({});
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
  const [hasChanges, setHasChanges] = useState(false);
  
  // AI Description suggestion states
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeDescriptionHeader, setActiveDescriptionHeader] = useState(null);

  // Initialize editable values from row data
  useEffect(() => {
    if (rowData && rowData.rowCells) {
      const initialValues = {};
      rowData.rowCells.forEach((cell, index) => {
        const header = rowData.headers[index];
        if (header) {
          initialValues[header.name] = cell ? cell.value : '';
        }
      });
      setEditableValues(initialValues);
      setHasChanges(false);
    }
  }, [rowData]);

  const handleValueChange = (headerName, newValue) => {
    setEditableValues(prev => ({
      ...prev,
      [headerName]: newValue
    }));
    setHasChanges(true);
  };

  const handleCellClick = (headerName) => {
    setEditingCell(headerName);
  };

  const handleCellSave = (headerName, newValue) => {
    handleValueChange(headerName, newValue);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e, headerName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave(headerName, e.target.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  // Handle description header click for AI suggestions
  const handleDescriptionHeaderClick = async (headerName) => {
    console.log(`💭 Clicked description header:`, headerName);
    
    const currentValue = editableValues[headerName] || '';
    
    if (!currentValue || currentValue.toString().trim() === '') {
      return;
    }

    // Toggle suggestions if clicking same header
    if (activeDescriptionHeader === headerName && showSuggestions) {
      setShowSuggestions(false);
      setActiveDescriptionHeader(null);
      setAiSuggestions([]);
      return;
    }

    setActiveDescriptionHeader(headerName);
    setShowSuggestions(true);
    setIsLoadingSuggestions(true);
    setAiSuggestions([]);

    try {
      // Call AI service for description suggestions
      const suggestions = await getDescriptionSuggestions(currentValue.toString());
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
    if (!activeDescriptionHeader) return;

    setEditableValues(prev => ({
      ...prev,
      [activeDescriptionHeader]: suggestion
    }));
    setHasChanges(true);

    // Clear suggestions
    setShowSuggestions(false);
    setActiveDescriptionHeader(null);
    setAiSuggestions([]);
    
    console.log(`✅ Updated description for header ${activeDescriptionHeader}:`, suggestion);
  };

  // Handle confirm button - save changes and update left unit
  const handleConfirm = () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    // Prepare updated row data with consistent structure
    const updatedRowData = {
      ...rowData,
      cells: rowData.headers.map((header, index) => {
        const originalCell = rowData.rowCells[index];
        const newValue = editableValues[header.name];
        return {
          ...originalCell,
          value: newValue !== undefined ? newValue : (originalCell ? originalCell.value : '')
        };
      }),
      rowCells: rowData.headers.map((header, index) => {
        const originalCell = rowData.rowCells[index];
        const newValue = editableValues[header.name];
        return {
          ...originalCell,
          value: newValue !== undefined ? newValue : (originalCell ? originalCell.value : '')
        };
      })
    };

    // Dispatch event to update left unit with new data
    window.dispatchEvent(new CustomEvent('excel-row-updated', {
      detail: {
        rowIndex: rowData.rowIndex,
        updatedRowData: updatedRowData,
        updatedValues: editableValues
      }
    }));

    console.log(`✅ Confirmed changes for row ${rowData.rowIndex}:`, updatedRowData);
    
    // Call onSave if provided
    if (onSave) {
      onSave(updatedRowData);
    }

    // Don't close editor automatically - let user decide when to close
    // onClose();
  };

  if (!rowData) {
    return null;
  }

  // Calculate column widths same as ExcelUnitView
  const getColumnWidth = (index) => {
    const totalCols = rowData.headers.length;
    if (totalCols <= 7) {
      switch (index) {
        case 0: return 'w-10'; // Redni broj
        case 1: return 'flex-1'; // Opis - takes remaining space
        case 2: return 'w-12'; // Jedinica
        case 3: return 'w-16'; // Količina
        case 4: return 'w-20'; // Cijena
        case 5: return 'w-20'; // Iznos
        default: return 'w-16';
      }
    } else {
      if (index === 1 || rowData.headers[index]?.name.toLowerCase().includes('opis')) {
        return 'flex-1'; // Description column
      }
      return 'w-16'; // Other columns
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleConfirm}
          className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
            hasChanges 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
          disabled={!hasChanges}
        >
          <Check size={16} />
          Potvrdi
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Table Header - same style as ExcelUnitView */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 rounded-t">
          <div className="flex text-xs">
            {rowData.headers.map((header, index) => {
              const isDescriptionColumn = index === 1 || header.name.toLowerCase().includes('opis');
              const isActiveDescription = activeDescriptionHeader === header.name && showSuggestions;
              
              return (
                <div
                  key={index}
                  className={`relative border-r border-slate-300 px-1 py-0.5 text-center font-medium ${getColumnWidth(index)} ${
                    index === rowData.headers.length - 1 ? 'border-r-0' : ''
                  } ${
                    isDescriptionColumn 
                      ? 'text-purple-700 cursor-pointer hover:text-purple-900 hover:bg-purple-50 bg-purple-25'
                      : 'text-slate-600'
                  } ${
                    isActiveDescription ? 'bg-purple-100 ring-2 ring-purple-300' : ''
                  }`}
                  title={header.name}
                  onClick={isDescriptionColumn ? () => handleDescriptionHeaderClick(header.name) : undefined}
                >
                  {header.name.length > 12 ? `${header.name.substring(0, 12)}...` : header.name}
                  {isDescriptionColumn && (
                    <span className="ml-1 text-purple-500 text-xs">✨</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editable Row - same style as ExcelUnitView */}
      <div className="flex-1 overflow-hidden">
        <div className="border border-slate-300 rounded-b bg-white">
          <div className="flex text-xs min-h-16">
            {rowData.headers.map((header, index) => {
              const headerName = header.name;
              const value = editableValues[headerName] || '';
              const isRowNumberColumn = index === 0;
              const isDescriptionColumn = index === 1 || headerName.toLowerCase().includes('opis');
              const cellJustifyClass = isRowNumberColumn || isDescriptionColumn ? 'justify-start' : 'justify-end';
              const cellAlignClass = isRowNumberColumn || isDescriptionColumn ? 'items-start' : 'items-end';

              return (
                <div
                  key={index}
                  className={`relative border-r border-slate-300 px-1 py-0.5 ${getColumnWidth(index)} ${
                    index === rowData.headers.length - 1 ? 'border-r-0' : ''
                  } flex flex-col ${cellJustifyClass} ${cellAlignClass}`}
                >
                  {isRowNumberColumn ? (
                    <div className="text-xs font-medium text-blue-600 leading-tight">
                      {value}
                    </div>
                  ) : editingCell === headerName ? (
                    // Editable input for the current cell
                    isDescriptionColumn ? (
                      <div className="relative w-full">
                        <div
                          aria-hidden="true"
                          className="invisible text-slate-700 break-words text-xs leading-tight py-1"
                        >
                          {value || <span className="text-slate-400 italic">Prazno</span>}
                        </div>
                        <textarea
                          value={value}
                          onChange={(e) => handleValueChange(headerName, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, headerName)}
                          onBlur={(e) => handleCellSave(headerName, e.target.value)}
                          className="absolute inset-0 w-full h-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-transparent leading-tight py-1"
                          placeholder="Unesi opis..."
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <div
                          aria-hidden="true"
                          className="invisible w-full text-right text-xs text-slate-700 leading-tight"
                        >
                          {value || <span className="text-slate-400 italic">-</span>}
                        </div>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleValueChange(headerName, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, headerName)}
                          onBlur={(e) => handleCellSave(headerName, e.target.value)}
                          className="absolute inset-x-0 bottom-0 w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent text-right leading-tight"
                          placeholder="..."
                          autoFocus
                        />
                      </div>
                    )
                  ) : (
                    // Display mode - clickable to edit
                    <div
                      onClick={() => handleCellClick(headerName)}
                      className="w-full cursor-pointer hover:bg-blue-50 rounded"
                    >
                      {isDescriptionColumn ? (
                        <div className="text-slate-700 break-words text-xs leading-tight py-1">
                          {value || <span className="text-slate-400 italic">Prazno</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-700 leading-tight text-right">
                          {value || <span className="text-slate-400 italic">-</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 border border-purple-200 rounded bg-purple-50 p-4"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-purple-700 font-medium">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              AI prijedlozi za opis "{activeDescriptionHeader}":
            </div>
            
            {isLoadingSuggestions ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                Analiziram opis...
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, suggIndex) => (
                  <button
                    key={suggIndex}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full text-left px-4 py-3 text-sm bg-white border border-purple-200 rounded hover:bg-purple-100 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-purple-600 font-semibold">{suggIndex + 1}.</span>
                      <span className="text-slate-700 leading-relaxed">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-red-500">
                Neuspješno dobijanje AI prijedloga
              </div>
            )}
            
            <button
              onClick={() => {
                setShowSuggestions(false);
                setActiveDescriptionHeader(null);
                setAiSuggestions([]);
              }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Zatvori prijedloge
            </button>
          </div>
        </motion.div>
      )}

      {/* Status indicator */}
      {hasChanges && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="text-xs text-amber-600">
            ⚠️ Imate nespremljene promjene - kliknite izvan ćelije za spremanje
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelRowEditor;





