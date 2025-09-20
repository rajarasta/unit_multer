import * as XLSX from 'xlsx';

/**
 * ExcelParserService - Servis za čitanje i parsiranje Excel datoteka
 * 
 * Odgovornosti:
 * - Čitanje .xlsx, .xls i .csv datoteka
 * - Parsiranje u JSON format
 * - Konverzija za prikaz u tablici
 * - Error handling za malformed datoteke
 * 
 * @class ExcelParserService
 */
class ExcelParserService {
  /**
   * Čita Excel datoteku i vraća parsiran sadržaj
   * @param {File} file - Excel datoteka
   * @returns {Promise<Object>} Parsirani podaci
   */
  async parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const result = {
              fileName: file.name,
              fileSize: file.size,
              sheets: {},
              sheetNames: workbook.SheetNames,
              defaultSheet: workbook.SheetNames[0] || null
            };
            
            // Parsiraj svaki sheet
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1, // Koristi array format
                defval: '' // Prazne ćelije kao prazan string
              });
              
              // Dodatno parsiraj u format koji je lakši za prikaz
              const formattedData = this.formatSheetData(jsonData);
              
              result.sheets[sheetName] = {
                rawData: jsonData,
                formattedData: formattedData,
                rowCount: jsonData.length,
                colCount: Math.max(...jsonData.map(row => row.length))
              };
            });
            
            console.log(`📊 Excel parsed successfully: ${file.name}`, result);
            resolve(result);
            
          } catch (parseError) {
            console.error('❌ Excel parsing error:', parseError);
            reject(new Error(`Failed to parse Excel file: ${parseError.message}`));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsArrayBuffer(file);
        
      } catch (error) {
        console.error('❌ File reading error:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Formatira raw sheet data za lakši prikaz u tablici
   * @param {Array} rawData - Raw data iz XLSX
   * @returns {Object} Formatirani podaci
   */
  formatSheetData(rawData) {
    if (!rawData || rawData.length === 0) {
      return { headers: [], rows: [] };
    }
    
    // Prvi red kao headers
    const headers = rawData[0] || [];
    
    // Ostali redovi kao data
    const rows = rawData.slice(1).map((row, index) => ({
      rowIndex: index + 1,
      cells: row.map((cell, cellIndex) => ({
        value: cell,
        column: headers[cellIndex] || `Col${cellIndex + 1}`,
        columnIndex: cellIndex
      }))
    }));
    
    return {
      headers: headers.map((header, index) => ({
        name: header || `Column ${index + 1}`,
        index: index
      })),
      rows: rows,
      summary: {
        totalRows: rows.length,
        totalColumns: headers.length,
        hasData: rows.length > 0
      }
    };
  }
  
  /**
   * Pretvara Excel data u CSV format
   * @param {Object} sheetData - Formatted sheet data
   * @returns {string} CSV string
   */
  convertToCSV(sheetData) {
    if (!sheetData || !sheetData.headers || !sheetData.rows) {
      return '';
    }
    
    const csvRows = [];
    
    // Add headers
    const headerRow = sheetData.headers.map(h => h.name).join(',');
    csvRows.push(headerRow);
    
    // Add data rows
    sheetData.rows.forEach(row => {
      const rowData = row.cells.map(cell => {
        // Escape commas and quotes in CSV
        let value = String(cell.value || '');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(rowData.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  /**
   * Eksportira parsirane podatke kao novi Excel file
   * @param {Object} parsedData - Parsirani podaci
   * @param {string} fileName - Ime datoteke za export
   */
  exportToExcel(parsedData, fileName = 'exported_data.xlsx') {
    try {
      const wb = XLSX.utils.book_new();
      
      Object.entries(parsedData.sheets).forEach(([sheetName, sheetData]) => {
        // Konvertiraj formattedData nazad u format koji XLSX razumije
        const wsData = [];
        
        // Headers
        if (sheetData.formattedData.headers) {
          wsData.push(sheetData.formattedData.headers.map(h => h.name));
        }
        
        // Rows
        if (sheetData.formattedData.rows) {
          sheetData.formattedData.rows.forEach(row => {
            wsData.push(row.cells.map(cell => cell.value));
          });
        }
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      
      XLSX.writeFile(wb, fileName);
      console.log(`✅ Excel exported: ${fileName}`);
      
    } catch (error) {
      console.error('❌ Excel export error:', error);
      throw new Error(`Failed to export Excel: ${error.message}`);
    }
  }
  
  /**
   * Validira da li je datoteka podržana Excel format
   * @param {File} file - Datoteka za validaciju
   * @returns {boolean} True ako je podržana
   */
  isValidExcelFile(file) {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }
  
  /**
   * Vrača statistike o Excel datoteci
   * @param {Object} parsedData - Parsirani podaci
   * @returns {Object} Statistike
   */
  getFileStatistics(parsedData) {
    if (!parsedData || !parsedData.sheets) {
      return null;
    }
    
    const stats = {
      fileName: parsedData.fileName,
      fileSize: parsedData.fileSize,
      totalSheets: parsedData.sheetNames.length,
      sheets: []
    };
    
    Object.entries(parsedData.sheets).forEach(([sheetName, sheetData]) => {
      stats.sheets.push({
        name: sheetName,
        rows: sheetData.rowCount,
        columns: sheetData.colCount,
        cellsWithData: sheetData.formattedData.rows.reduce((count, row) => {
          return count + row.cells.filter(cell => cell.value && cell.value.toString().trim() !== '').length;
        }, 0)
      });
    });
    
    return stats;
  }
}

// Singleton instance
export const excelParserService = new ExcelParserService();
export default ExcelParserService;