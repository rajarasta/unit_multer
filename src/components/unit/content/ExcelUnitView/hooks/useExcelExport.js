import { useCallback } from 'react';

const useExcelExport = (parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError) => {

  // Helper function for base64 to blob conversion
  const b64toBlob = useCallback((b64Data, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  }, []);

  // Print functionality with styled output
  const handlePrint = useCallback(() => {
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

                    return `<td class="${className}">${displayValue}</td>`;
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
  }, [parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError]);

  // Export to styled Excel
  const handleExportExcel = useCallback(async () => {
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
      const ws = XLSX.utils.aoa_to_sheet(exportData);

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

      // Set row heights and other styling...
      const rowHeights = [];
      rows.forEach((row, rowIndex) => {
        const excelRowIndex = (rowIndex * 2) + 1;
        const actualRow = updatedRows[rowIndex] || row;
        let maxHeight = 20;

        if (actualRow?.cells) {
          headers.forEach((header, cellIndex) => {
            const cell = actualRow.cells[cellIndex];
            const value = cell ? String(cell.value || '') : '';

            if (value.trim()) {
              const columnWidth = colWidths[cellIndex]?.wch || 15;
              const charsPerLine = Math.floor(columnWidth * 1.2);
              const lines = Math.ceil(value.length / charsPerLine);
              const estimatedHeight = Math.max(20, lines * 15);
              maxHeight = Math.max(maxHeight, estimatedHeight);
            }
          });
        }

        rowHeights[excelRowIndex] = { hpt: maxHeight };
        rowHeights[excelRowIndex + 1] = { hpt: 8 };
      });

      ws['!rows'] = rowHeights;

      // Add styling and metadata
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
      headers.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (!ws[cellRef]) ws[cellRef] = { v: header.name };
        ws[cellRef].s = headerStyle;
      });

      // Style data rows
      rows.forEach((row, rowIndex) => {
        try {
          const updatedRow = updatedRows[rowIndex];
          const isNormalized = !!updatedRow;
          const excelRowIndex = (rowIndex * 2) + 1;

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

            if (isDescriptionColumn) {
              cellStyle.alignment = { wrapText: true, vertical: "top" };
            }

            if (isNormalized) {
              cellStyle.fill = { fgColor: { rgb: "ECFDF5" } };
              cellStyle.font = { color: { rgb: "065F46" }, bold: true };
            }

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
  }, [parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError]);

  return {
    handlePrint,
    handleExportExcel,
    b64toBlob
  };
};

export default useExcelExport;