import React from 'react';
import { Sparkles } from 'lucide-react';

const TableView = ({
  currentSheetData,
  maxRows,
  setMaxRows,
  updatedRows,
  diffMeta,
  updatedDescriptions,
  activeDescriptionRow,
  handleRowNumberClick,
  handleDescriptionAgentClick
}) => {
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
                        <div className="text-xs leading-tight group relative">
                          <div className={`break-words ${hasUpdatedDescription ? 'text-green-700 font-medium' : 'text-slate-700'}`}>
                            {hasUpdatedDescription ? updatedDescriptions[rowKey] : displayValue}
                          </div>
                          {hasUpdatedDescription && (
                            <div className="text-xs text-green-600 mt-1 italic">
                              (AI poboljšano)
                            </div>
                          )}
                          {/* AI Agent Trigger */}
                          {displayValue && displayValue.length > 10 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDescriptionAgentClick(rowIndex, cellIndex, value);
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-100 rounded"
                              title="Analiziraj s AI agentom"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            </button>
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

export default TableView;