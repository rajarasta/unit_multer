import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, BarChart3, Table, Grid3x3, Sparkles, Zap, Printer, Download, FileDown } from 'lucide-react';
import { excelParserService } from '../../../services/ExcelParserService';
import AgentOverlay from '../../AgentOverlay';
import { useAgentOverlay } from '../../../hooks/useAgentOverlay';

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
  
  // Normalization states
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizedData, setNormalizedData] = useState(null);
  const [diffMeta, setDiffMeta] = useState({});
  const [normalizedXlsxUrl, setNormalizedXlsxUrl] = useState(null);
  
  // Agent Overlay hook
  const { isActive: agentActive, agentInput, targetComponent, endpoint, showAgent, hideAgent } = useAgentOverlay();

  // Helper function for base64 to blob conversion
  const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
  };

  // Normalization functions
  const onNormalize = async () => {
    if(!parsedData || !activeSheet) {
      setError('No data to normalize');
      return;
    }
    
    setIsNormalizing(true);
    setError(null);
    
    try {
      const currentSheet = parsedData.sheets[activeSheet];
      const payload = {
        fileName: parsedData.fileName,
        sheetName: activeSheet,
        headers: currentSheet.rawHeaders || currentSheet.formattedData.headers.map(h => h.name),
        rowsSample: currentSheet.formattedData.rows.slice(0, 500).map(r => r.cells.map(c => c.value))
      };
      
      console.log('🚀 Sending normalization request:', payload);
      
      const resp = await fetch('/api/normalize-excel', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      
      if(!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Normalize failed ${resp.status}: ${errorText}`);
      }
      
      const body = await resp.json();
      console.log('✅ Normalization response:', body);
      handleNormalizedResponse(body);
      
    } catch(err) {
      console.error('❌ Normalize failed:', err);
      setError(err.message || String(err));
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleNormalizedResponse = (payload) => {
    if(!payload || !payload.normalized) {
      setError('No normalized payload received');
      return;
    }
    
    const normalized = payload.normalized;
    console.log('📊 Processing normalized data:', normalized);
    
    // Build updatedRows mapping by index
    const newUpdatedRows = {};
    const newDiffMeta = {};
    
    normalized.rows.forEach((r, idx) => {
      newUpdatedRows[idx] = {
        cells: [
          { value: r.rb || '' },
          { value: r.opis || '' },
          { value: r.jedinica || '' },
          { value: r.kolicina ?? '' },
          { value: r.jed_cijena ?? '' },
          { value: r.iznos ?? '' }
        ],
        meta: { confidence: r.confidence ?? 0 }
      };
      
      const diffInfo = payload.diffMeta?.find(d => d.rowIndex === idx) || { 
        changedCols: [], 
        confidence: r.confidence ?? 0 
      };
      newDiffMeta[idx] = diffInfo;
    });
    
    setUpdatedRows(prev => ({ ...prev, ...newUpdatedRows }));
    setDiffMeta(prev => ({ ...prev, ...newDiffMeta }));
    setNormalizedData(normalized);
    
    // Store normalized xlsx for download
    if(payload.xlsxBase64) {
      const blob = b64toBlob(payload.xlsxBase64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const url = URL.createObjectURL(blob);
      setNormalizedXlsxUrl(url);
    }
    
    console.log('🎯 Normalization complete. Updated rows:', Object.keys(newUpdatedRows).length);
  };

  const applyRow = (rowIndex) => {
    if(!updatedRows[rowIndex]) return;
    
    setParsedData(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone.sheets[activeSheet].formattedData.rows[rowIndex] = updatedRows[rowIndex];
      return clone;
    });
    
    setUpdatedRows(prev => {
      const copy = {...prev}; 
      delete copy[rowIndex]; 
      return copy;
    });
    
    console.log(`✅ Applied normalized row ${rowIndex}`);
  };

  const rejectRow = (rowIndex) => {
    setUpdatedRows(prev => {
      const copy = {...prev}; 
      delete copy[rowIndex]; 
      return copy;
    });
    
    setDiffMeta(prev => {
      const copy = {...prev}; 
      delete copy[rowIndex]; 
      return copy;
    });
    
    console.log(`❌ Rejected normalized row ${rowIndex}`);
  };

  // Print functionality with styled output
  const handlePrint = () => {
    if (!parsedData || !activeSheet) {
      setError('No data to print');
      return;
    }

    const currentSheet = parsedData.sheets[activeSheet];
    const headers = currentSheet.formattedData.headers;
    const rows = currentSheet.formattedData.rows.slice(0, maxRows);
    
    // Generate print-friendly HTML with embedded styles
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${parsedData.fileName} - ${activeSheet}</title>
        <style>
          @media print {
            @page {
              margin: 0.5in;
              size: A4 landscape;
            }
            body { margin: 0; }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10px;
            line-height: 1.2;
            color: #374151;
            background: white;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          
          .print-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 4px;
          }
          
          .print-subtitle {
            font-size: 12px;
            color: #6b7280;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .print-table th {
            background-color: #f9fafb;
            border: 1px solid #d1d5db;
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            color: #374151;
          }
          
          .print-table td {
            border: 1px solid #e5e7eb;
            padding: 6px 4px;
            font-size: 9px;
            vertical-align: top;
          }
          
          .print-table tr:nth-child(even) {
            background-color: #f9fafb;
          }
          
          .print-table tr:hover {
            background-color: #f3f4f6;
          }
          
          .col-rb { width: 6%; text-align: center; }
          .col-opis { width: 40%; }
          .col-jedinica { width: 8%; text-align: center; }
          .col-kolicina { width: 10%; text-align: right; }
          .col-cijena { width: 12%; text-align: right; }
          .col-iznos { width: 12%; text-align: right; }
          .col-other { width: 12%; }
          
          .print-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
          }
          
          .updated-row {
            background-color: #ecfdf5 !important;
          }
          
          .updated-row td {
            color: #065f46;
            font-weight: 500;
          }
          
          .confidence-badge {
            background-color: #dbeafe;
            color: #1e40af;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: 500;
            display: inline-block;
            margin-left: 4px;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">${parsedData.fileName}</div>
          <div class="print-subtitle">Sheet: ${activeSheet} | Printed: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          ${normalizedData ? '<div class="print-subtitle" style="color: #059669; font-weight: 500;">✓ Normalized Data</div>' : ''}
        </div>
        
        <table class="print-table">
          <thead>
            <tr>
              ${headers.map((header, index) => {
                let className = 'col-other';
                const headerName = header.name.toLowerCase();
                if (headerName.includes('redni') || headerName.includes('rb')) className = 'col-rb';
                else if (headerName.includes('opis') || headerName.includes('description')) className = 'col-opis';
                else if (headerName.includes('jedinica') || headerName.includes('unit')) className = 'col-jedinica';
                else if (headerName.includes('količina') || headerName.includes('kol') || headerName.includes('qty')) className = 'col-kolicina';
                else if (headerName.includes('cijena') || headerName.includes('price')) className = 'col-cijena';
                else if (headerName.includes('iznos') || headerName.includes('amount') || headerName.includes('total')) className = 'col-iznos';
                
                return `<th class="${className}">${header.name}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, rowIndex) => {
              const updatedRow = updatedRows[rowIndex];
              const actualRow = updatedRow || row;
              const isUpdated = !!updatedRow;
              const confidence = diffMeta[rowIndex]?.confidence;
              
              if (!actualRow?.cells) return '';
              
              return `
                <tr class="${isUpdated ? 'updated-row' : ''}">
                  ${headers.map((header, cellIndex) => {
                    if (cellIndex >= actualRow.cells.length) return '<td>-</td>';
                    
                    const cell = actualRow.cells[cellIndex];
                    const value = cell ? cell.value : '';
                    let displayValue = String(value || '').trim();
                    
                    // Format numbers
                    if (typeof value === 'number') {
                      displayValue = value.toLocaleString();
                    }
                    
                    let className = 'col-other';
                    const headerName = header.name.toLowerCase();
                    if (headerName.includes('redni') || headerName.includes('rb')) className = 'col-rb';
                    else if (headerName.includes('opis') || headerName.includes('description')) className = 'col-opis';
                    else if (headerName.includes('jedinica') || headerName.includes('unit')) className = 'col-jedinica';
                    else if (headerName.includes('količina') || headerName.includes('kol') || headerName.includes('qty')) className = 'col-kolicina';
                    else if (headerName.includes('cijena') || headerName.includes('price')) className = 'col-cijena';
                    else if (headerName.includes('iznos') || headerName.includes('amount') || headerName.includes('total')) className = 'col-iznos';
                    
                    return `<td class="${className}">${displayValue}${confidence && cellIndex === 0 ? `<span class="confidence-badge">${(confidence * 100).toFixed(0)}%</span>` : ''}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="print-footer">
          <div>Total rows: ${rows.length}${rows.length < currentSheet.formattedData.rows.length ? ` (showing first ${rows.length})` : ''}</div>
          ${normalizedData ? `<div>Normalized rows: ${Object.keys(updatedRows).length} | Generated by AI Normalization System</div>` : ''}
          <div>Generated from ${parsedData.fileName} | Claude Code Excel Processor</div>
        </div>
      </body>
      </html>
    `;

    // Create new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Optionally close window after printing
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
    } else {
      setError('Could not open print window. Please check popup blockers.');
    }
  };

  // Export to styled Excel
  const handleExportExcel = async () => {
    if (!parsedData || !activeSheet) {
      setError('No data to export');
      return;
    }

    try {
      // Dynamic import of xlsx library
      const XLSX = await import('xlsx');
      
      const currentSheet = parsedData.sheets[activeSheet];
      const headers = currentSheet.formattedData.headers;
      const rows = currentSheet.formattedData.rows.slice(0, maxRows);
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Prepare data for export
      const exportData = [];
      
      // Add headers
      exportData.push(headers.map(h => h.name));
      
      // Add rows with proper formatting and empty rows between
      rows.forEach((row, rowIndex) => {
        const updatedRow = updatedRows[rowIndex];
        const actualRow = updatedRow || row;
        
        if (actualRow?.cells) {
          const rowData = headers.map((header, cellIndex) => {
            if (cellIndex >= actualRow.cells.length) return '';
            
            const cell = actualRow.cells[cellIndex];
            let value = cell ? cell.value : '';
            
            // Format numbers properly
            if (typeof value === 'number') {
              return value;
            }
            
            return String(value || '').trim();
          });
          
          exportData.push(rowData);
          
          // Add empty row after each data row
          const emptyRow = headers.map(() => '');
          exportData.push(emptyRow);
        }
      });
      
      // Create worksheet
      console.log('Creating worksheet with data:', { 
        rows: exportData.length, 
        headers: headers.length,
        firstRow: exportData[0]
      });
      
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      console.log('Worksheet created successfully');
      
      // Calculate optimal column widths based on actual content
      const colWidths = headers.map((header, headerIndex) => {
        const headerName = header.name.toLowerCase();
        
        // Start with header width
        let maxWidth = header.name.length;
        
        // Check all data in this column
        rows.forEach(row => {
          const actualRow = updatedRows[rows.indexOf(row)] || row;
          if (actualRow?.cells && actualRow.cells[headerIndex]) {
            const cell = actualRow.cells[headerIndex];
            const value = cell ? String(cell.value || '') : '';
            
            // For description columns, limit max width but allow reasonable text
            if (headerName.includes('opis') || headerName.includes('description')) {
              // Allow longer descriptions but cap at reasonable width
              const lines = value.split('\n');
              const longestLine = lines.reduce((max, line) => 
                line.length > max ? line.length : max, 0);
              maxWidth = Math.max(maxWidth, Math.min(longestLine, 60));
            } else {
              // For other columns, use actual content length
              maxWidth = Math.max(maxWidth, value.length);
            }
          }
        });
        
        // Apply minimum and maximum constraints based on column type
        if (headerName.includes('redni') || headerName.includes('rb')) {
          return { wch: Math.max(5, Math.min(maxWidth, 8)) };
        } else if (headerName.includes('opis') || headerName.includes('description')) {
          return { wch: Math.max(20, Math.min(maxWidth, 60)) };
        } else if (headerName.includes('jedinica') || headerName.includes('unit')) {
          return { wch: Math.max(8, Math.min(maxWidth, 15)) };
        } else if (headerName.includes('količina') || headerName.includes('kol') || headerName.includes('qty')) {
          return { wch: Math.max(8, Math.min(maxWidth, 12)) };
        } else if (headerName.includes('cijena') || headerName.includes('price')) {
          return { wch: Math.max(10, Math.min(maxWidth, 18)) };
        } else if (headerName.includes('iznos') || headerName.includes('amount') || headerName.includes('total')) {
          return { wch: Math.max(10, Math.min(maxWidth, 18)) };
        } else {
          return { wch: Math.max(8, Math.min(maxWidth, 25)) };
        }
      });
      ws['!cols'] = colWidths;
      
      // Set row heights - calculate based on tallest cell in each row (after colWidths is defined)
      const rowHeights = [];
      rows.forEach((row, rowIndex) => {
        const excelRowIndex = (rowIndex * 2) + 1;
        
        // Calculate row height based on ALL cells in the row
        const actualRow = updatedRows[rowIndex] || row;
        let maxHeight = 20; // Default height
        
        if (actualRow?.cells) {
          headers.forEach((header, cellIndex) => {
            const cell = actualRow.cells[cellIndex];
            const value = cell ? String(cell.value || '') : '';
            
            if (value.trim()) {
              // Get actual calculated column width from colWidths array
              const columnWidth = colWidths[cellIndex]?.wch || 15;
              
              // Calculate lines needed based on actual column width
              const charsPerLine = Math.floor(columnWidth * 1.2);
              const lines = Math.ceil(value.length / charsPerLine);
              const estimatedHeight = Math.max(20, lines * 15);
              maxHeight = Math.max(maxHeight, estimatedHeight);
            }
          });
        }
        
        rowHeights[excelRowIndex] = { hpt: maxHeight };
        rowHeights[excelRowIndex + 1] = { hpt: 8 }; // Empty row height
      });
      
      // Apply row heights to worksheet
      ws['!rows'] = rowHeights;
      
      // Style the header row
      const headerStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: "F3F4F6" } },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } }
        },
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      // Apply header styling
      console.log('Applying header styling to', headers.length, 'headers');
      headers.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellRef]) ws[cellRef] = { v: header.name };
        ws[cellRef].s = headerStyle;
      });
      console.log('Header styling applied');
      
      // Style data rows (account for empty rows between data)
      console.log('Styling data rows, total rows:', rows.length);
      rows.forEach((row, rowIndex) => {
        try {
          const updatedRow = updatedRows[rowIndex];
          const isNormalized = !!updatedRow;
          
          // Actual row position in Excel (accounting for empty rows)
          const excelRowIndex = (rowIndex * 2) + 1; // Data rows are at positions 1, 3, 5, etc.
        
        headers.forEach((header, cellIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: excelRowIndex, c: cellIndex });
          
          const headerName = header.name.toLowerCase();
          const isDescriptionColumn = headerName.includes('opis') || headerName.includes('description');
          
          let cellStyle = {
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } }
            }
          };
          
          // Add wrap text for description columns
          if (isDescriptionColumn) {
            cellStyle.alignment = { wrapText: true, vertical: "top" };
          }
          
          // Style normalized rows
          if (isNormalized) {
            cellStyle.fill = { fgColor: { rgb: "ECFDF5" } };
            cellStyle.font = { color: { rgb: "065F46" }, bold: true };
          }
          
          // Align numbers to the right
          if (headerName.includes('količina') || headerName.includes('cijena') || 
              headerName.includes('iznos') || headerName.includes('kol') || 
              headerName.includes('price') || headerName.includes('amount')) {
            if (cellStyle.alignment) {
              cellStyle.alignment.horizontal = "right";
            } else {
              cellStyle.alignment = { horizontal: "right" };
            }
          }
          
          if (ws[cellRef]) {
            ws[cellRef].s = cellStyle;
          }
        });
        } catch (rowError) {
          console.error('Error styling row', rowIndex, ':', rowError);
        }
      });
      console.log('Data row styling completed');
      
      // Add metadata sheet
      const metaData = [
        ['Export Information'],
        ['Source File', parsedData.fileName],
        ['Sheet Name', activeSheet],
        ['Export Date', new Date().toLocaleString()],
        ['Total Rows', rows.length],
        ['Normalized Rows', Object.keys(updatedRows).length],
        [''],
        ['Column Information'],
        ['Column', 'Type', 'Width'],
        ...headers.map((header, index) => {
          const headerName = header.name.toLowerCase();
          let type = 'Text';
          if (headerName.includes('redni') || headerName.includes('rb')) type = 'Index';
          if (headerName.includes('opis') || headerName.includes('description')) type = 'Description';
          if (headerName.includes('jedinica') || headerName.includes('unit')) type = 'Unit';
          if (headerName.includes('količina') || headerName.includes('kol') || headerName.includes('qty')) type = 'Quantity';
          if (headerName.includes('cijena') || headerName.includes('price')) type = 'Price';
          if (headerName.includes('iznos') || headerName.includes('amount') || headerName.includes('total')) type = 'Amount';
          
          return [header.name, type, colWidths[index].wch];
        })
      ];
      
      const metaWs = XLSX.utils.aoa_to_sheet(metaData);
      metaWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 10 }];
      
      // Add sheets to workbook
      XLSX.utils.book_append_sheet(wb, ws, activeSheet);
      XLSX.utils.book_append_sheet(wb, metaWs, 'Export Info');
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const normalizedSuffix = normalizedData ? '-normalized' : '';
      const filename = `${parsedData.fileName.replace(/\.\w+$/, '')}-export${normalizedSuffix}-${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      console.log(`✅ Excel exported: ${filename}`);
      
    } catch (error) {
      console.error('❌ Excel export failed:', error);
      setError(`Excel export failed: ${error.message}`);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (!parsedData || !activeSheet) {
      setError('No data to export to PDF');
      return;
    }

    try {
      // Import both modules first
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      
      const { jsPDF } = jsPDFModule;
      console.log('jsPDF loaded:', typeof jsPDF);
      console.log('AutoTable module loaded:', autoTableModule);
      
      const currentSheet = parsedData.sheets[activeSheet];
      const headers = currentSheet.formattedData.headers;
      const rows = currentSheet.formattedData.rows.slice(0, maxRows);
      
      // Create PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Debug: Check if autoTable is available
      console.log('autoTable available?', typeof doc.autoTable);
      if (typeof doc.autoTable !== 'function') {
        console.warn('AutoTable not available, using manual table rendering');
        
        // Manual table rendering fallback - Excel print style
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const tableWidth = pageWidth - (margin * 2);
        
        // Add document title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(parsedData.fileName, margin, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sheet: ${activeSheet} | Exported: ${new Date().toLocaleDateString()}`, margin, 28);
        
        let yPosition = 45;
        const baseRowHeight = 12; // Increased for better readability
        const cellPadding = 4; // Rich padding like Excel
        
        // Calculate optimal column widths based on content
        const colWidths = headers.map((header, headerIndex) => {
          let maxWidth = doc.getTextWidth(header.name) + (cellPadding * 2);
          
          // Check data content to determine optimal width
          rows.forEach(row => {
            const actualRow = updatedRows[rows.indexOf(row)] || row;
            if (actualRow?.cells && actualRow.cells[headerIndex]) {
              const cell = actualRow.cells[headerIndex];
              const value = String(cell?.value || '');
              const textWidth = doc.getTextWidth(value) + (cellPadding * 2);
              
              // For description columns, allow reasonable width but not too wide
              const headerName = header.name.toLowerCase();
              if (headerName.includes('opis') || headerName.includes('description')) {
                maxWidth = Math.max(maxWidth, Math.min(textWidth, tableWidth * 0.4));
              } else {
                maxWidth = Math.max(maxWidth, Math.min(textWidth, tableWidth * 0.15));
              }
            }
          });
          
          return Math.max(maxWidth, 20); // Minimum width
        });
        
        // Normalize widths to fit table
        const totalDesiredWidth = colWidths.reduce((sum, w) => sum + w, 0);
        const scaleFactor = totalDesiredWidth > tableWidth ? tableWidth / totalDesiredWidth : 1;
        const finalColWidths = colWidths.map(w => w * scaleFactor);
        
        // Draw table headers (clean Excel style)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        
        let xPosition = margin;
        headers.forEach((header, index) => {
          const colWidth = finalColWidths[index];
          
          // No background fill, no borders - clean like Excel print
          doc.text(header.name, xPosition + cellPadding, yPosition + 8);
          xPosition += colWidth;
        });
        
        yPosition += baseRowHeight + 4; // Extra space after headers
        
        // Draw data rows with word wrap and full text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        rows.forEach((row, rowIndex) => {
          const actualRow = updatedRows[rowIndex] || row;
          
          if (actualRow?.cells) {
            let rowHeight = baseRowHeight;
            let xPosition = margin;
            
            // First pass: calculate row height based on text wrapping
            const cellTexts = [];
            headers.forEach((header, cellIndex) => {
              const colWidth = finalColWidths[cellIndex];
              const maxTextWidth = colWidth - (cellPadding * 2);
              
              if (cellIndex < actualRow.cells.length) {
                const cell = actualRow.cells[cellIndex];
                const value = String(cell?.value || '').trim();
                
                // Split text into lines that fit the column width
                const words = value.split(' ');
                const lines = [];
                let currentLine = '';
                
                words.forEach(word => {
                  const testLine = currentLine ? `${currentLine} ${word}` : word;
                  const testWidth = doc.getTextWidth(testLine);
                  
                  if (testWidth <= maxTextWidth) {
                    currentLine = testLine;
                  } else {
                    if (currentLine) {
                      lines.push(currentLine);
                      currentLine = word;
                    } else {
                      // Single word is too long, truncate it
                      lines.push(word.substring(0, Math.floor(maxTextWidth / 6)) + '...');
                      currentLine = '';
                    }
                  }
                });
                
                if (currentLine) lines.push(currentLine);
                cellTexts.push(lines);
                
                // Update row height based on number of lines
                const lineHeight = 5;
                const cellHeight = Math.max(baseRowHeight, lines.length * lineHeight + (cellPadding * 2));
                rowHeight = Math.max(rowHeight, cellHeight);
              } else {
                cellTexts.push(['']);
              }
            });
            
            // Second pass: draw the text
            xPosition = margin;
            headers.forEach((header, cellIndex) => {
              const colWidth = finalColWidths[cellIndex];
              const lines = cellTexts[cellIndex] || [''];
              
              // Draw each line of text
              lines.forEach((line, lineIndex) => {
                const textY = yPosition + cellPadding + 4 + (lineIndex * 5);
                if (line.trim()) {
                  doc.text(line, xPosition + cellPadding, textY);
                }
              });
              
              xPosition += colWidth;
            });
            
            yPosition += rowHeight;
            
            // Add spacing between rows (like Excel print)
            yPosition += 6;
            
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
              doc.addPage();
              yPosition = 30;
              
              // Re-add headers on new page
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              xPosition = margin;
              headers.forEach((header, index) => {
                const colWidth = finalColWidths[index];
                doc.text(header.name, xPosition + cellPadding, yPosition + 8);
                xPosition += colWidth;
              });
              yPosition += baseRowHeight + 4;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
            }
          }
        });
        
        // Generate filename and save
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `${parsedData.fileName.replace(/\.\w+$/, '')}-export-${timestamp}.pdf`;
        doc.save(filename);
        
        console.log(`✅ PDF exported (manual): ${filename}`);
        return;
      }
      
      // Add title and metadata
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(parsedData.fileName, 20, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Sheet: ${activeSheet}`, 20, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
      
      if (normalizedData) {
        doc.setTextColor(0, 150, 100);
        doc.text('✓ Normalized Data', 200, 30);
        doc.setTextColor(0, 0, 0);
      }
      
      // Prepare table data
      const tableHeaders = headers.map(h => h.name);
      const tableData = rows.map((row, rowIndex) => {
        const updatedRow = updatedRows[rowIndex];
        const actualRow = updatedRow || row;
        
        if (!actualRow?.cells) return [];
        
        return headers.map((header, cellIndex) => {
          if (cellIndex >= actualRow.cells.length) return '';
          
          const cell = actualRow.cells[cellIndex];
          let value = cell ? cell.value : '';
          
          // Format numbers
          if (typeof value === 'number') {
            return value.toLocaleString();
          }
          
          return String(value || '').trim();
        });
      });
      
      // Configure autoTable for clean Excel print style
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: 50,
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [255, 255, 255], // No borders - clean like Excel print
          lineWidth: 0,
          textColor: [0, 0, 0],
          fillColor: [255, 255, 255] // No background fills
        },
        headStyles: {
          fillColor: [255, 255, 255], // No header background
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 10,
          lineColor: [255, 255, 255],
          lineWidth: 0
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // RB
          1: { cellWidth: 80 }, // Opis
          2: { cellWidth: 20, halign: 'center' }, // Jedinica
          3: { cellWidth: 25, halign: 'right' }, // Količina
          4: { cellWidth: 30, halign: 'right' }, // Cijena
          5: { cellWidth: 30, halign: 'right' } // Iznos
        },
        didParseCell: function(data) {
          // Highlight normalized rows
          const rowIndex = data.row.index;
          if (updatedRows[rowIndex]) {
            data.cell.styles.fillColor = [236, 253, 245]; // Light green
            data.cell.styles.textColor = [6, 95, 70]; // Dark green
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: function(data) {
          // Add footer
          const pageCount = doc.internal.getNumberOfPages();
          const pageSize = doc.internal.pageSize;
          
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} | Generated by Claude Code Excel Processor`, 
            20, 
            pageSize.height - 10
          );
          
          if (normalizedData) {
            doc.text(
              `Normalized rows: ${Object.keys(updatedRows).length} | Total rows: ${rows.length}`,
              pageSize.width - 80,
              pageSize.height - 10
            );
          }
        }
      });
      
      // Generate filename and save
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const normalizedSuffix = normalizedData ? '-normalized' : '';
      const filename = `${parsedData.fileName.replace(/\.\w+$/, '')}-export${normalizedSuffix}-${timestamp}.pdf`;
      
      doc.save(filename);
      
      console.log(`✅ PDF exported: ${filename}`);
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      setError(`PDF export failed: ${error.message}. Make sure you have internet connection for loading required libraries.`);
    }
  };
  
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

Istraži šta ovaj opis znači i predloži bolji opis koji bi bio:
1. Jasniji i precizniji
2. Više tehnički specificni
3. Lakši za razumijevanje

Vrati samo 1 prijedlog u novom redu, bez dodatnih objašnjenja.`;

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

  // Handle description click with Agent Overlay
  const handleDescriptionAgentClick = (rowIndex, cellIndex, description) => {
    console.log(`🤖 Agent analysis for row ${rowIndex}:`, description);
    
    if (!description || description.toString().trim() === '') {
      return;
    }

    showAgent(
      description.toString(),
      `ExcelUnit-Row${rowIndex}-Cell${cellIndex}`,
      'http://10.71.21.136:1234/v1/chat/completions'
    );
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
  }, [activeDescriptionRow, hideAgent]);

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
              {/* Actions column header */}
              <th className="border border-slate-300 px-1 py-1 bg-slate-100 text-xs font-semibold text-slate-700 sticky top-0 z-10" style={{width: '80px'}}>
                Actions
              </th>
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
                  
                  {/* Actions column */}
                  <td className="border border-slate-300 px-1 py-0.5 text-center">
                    {updatedRow && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => applyRow(rowIndex)}
                          className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          title="Apply normalized changes"
                        >
                          ✓ Apply
                        </button>
                        <button
                          onClick={() => rejectRow(rowIndex)}
                          className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          title="Reject normalized changes"
                        >
                          ✗ Reject
                        </button>
                        {diffMeta[rowIndex] && (
                          <div className="text-xs text-slate-500 mt-1">
                            Conf: {(diffMeta[rowIndex].confidence || 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
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
          
          {/* Normalize Button */}
          <div className="mx-1 h-3 w-px bg-slate-300"></div>
          <button
            onClick={onNormalize}
            disabled={isNormalizing || !parsedData}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isNormalizing 
                ? 'bg-orange-100 text-orange-600 cursor-not-allowed' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
            title="Normalize Excel data to standard BoQ format"
          >
            <Zap size={10} className="inline mr-1" />
            {isNormalizing ? 'Normalizing...' : 'Normalize'}
          </button>
          
          {/* Export Buttons */}
          <div className="mx-1 h-3 w-px bg-slate-300"></div>
          
          <button
            onClick={handleExportExcel}
            disabled={!parsedData}
            className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to styled Excel with metadata"
          >
            <FileSpreadsheet size={10} className="inline mr-1" />
            Excel
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={!parsedData}
            className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to PDF with styling"
          >
            <FileDown size={10} className="inline mr-1" />
            PDF
          </button>

          <button
            onClick={handlePrint}
            disabled={!parsedData}
            className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Print Excel data with styling"
          >
            <Printer size={10} className="inline mr-1" />
            Print
          </button>

          {/* Download normalized XLSX */}
          {normalizedXlsxUrl && (
            <a 
              href={normalizedXlsxUrl} 
              download={`${parsedData?.fileName?.replace(/\.\w+$/, '') || 'file'}-normalized.xlsx`}
              className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
              title="Download normalized XLSX file"
            >
              📥 Download
            </a>
          )}
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
          {viewMode === 'table' && renderTableView()}
          {viewMode === 'stats' && renderStatsView()}
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




