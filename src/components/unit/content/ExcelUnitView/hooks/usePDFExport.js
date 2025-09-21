import { useCallback } from 'react';

const usePDFExport = (parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError) => {

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
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
        didParseCell: function (data) {
          // Highlight normalized rows
          const rowIndex = data.row.index;
          if (updatedRows[rowIndex]) {
            data.cell.styles.fillColor = [236, 253, 245]; // Light green
            data.cell.styles.textColor = [6, 95, 70]; // Dark green
            data.cell.styles.fontStyle = 'bold';
          }
        },
        didDrawPage: function (data) {
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
  }, [parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError]);

  return {
    handleExportPDF
  };
};

export default usePDFExport;