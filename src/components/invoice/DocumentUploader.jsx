import React, { useRef, useCallback } from 'react';
import { Upload, Plus } from 'lucide-react';

/**
 * DocumentUploader - Komponenta za upload dokumenata
 * 
 * Podržava drag & drop i click-to-upload funkcionalnosti
 * Validira file tipove i veličine prije upload-a
 * 
 * @param {Function} onFileUpload - Callback za uspješan upload
 * @param {boolean} isUploading - Loading state
 * @param {Array} acceptedTypes - Prihvaćeni file tipovi
 * @param {number} maxFileSize - Max file size u bytes
 * @param {boolean} multiple - Allow multiple files
 */
export default function DocumentUploader({ 
  onFileUpload, 
  isUploading = false,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  className = ''
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((files) => {
    if (!files?.length) return;
    
    const validFiles = Array.from(files).filter(file => {
      // Provjeri tip
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        console.warn(`Invalid file type: ${file.type} for ${file.name}`);
        return false;
      }
      
      // Provjeri veličinu
      if (file.size > maxFileSize) {
        console.warn(`File too large: ${file.size} bytes for ${file.name}`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      onFileUpload?.(validFiles);
    }
  }, [onFileUpload, maxFileSize]);

  const handleInputChange = useCallback((e) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // Reset input za ponovni upload istog fajla
  }, [handleFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isUploading) return;
    
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, isUploading]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClick = useCallback(() => {
    if (isUploading) return;
    fileInputRef.current?.click();
  }, [isUploading]);

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
        accept={acceptedTypes.join(',')}
        multiple={multiple}
      />

      {/* Upload area */}
      <div 
        className={`
          flex flex-col items-center justify-center h-full 
          border-2 border-dashed border-gray-300 rounded-xl 
          transition-all duration-200 cursor-pointer
          hover:border-blue-400 hover:bg-blue-50
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Upload className={`w-16 h-16 mb-4 ${isUploading ? 'text-gray-300' : 'text-gray-400'}`} />
        
        <h2 className="text-xl font-semibold mb-2 text-gray-700">
          {isUploading ? 'Učitavanje...' : 'Kliknite ili povucite datoteke'}
        </h2>
        
        <p className="text-gray-600 mb-4">
          {acceptedTypes.join(', ').replace(/\./g, '').toUpperCase()} • max {Math.round(maxFileSize / 1024 / 1024)}MB
        </p>
        
        <button
          className={`
            px-6 py-3 rounded-lg transition-colors font-medium
            ${isUploading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
          disabled={isUploading}
        >
          {isUploading ? 'Učitavanje...' : 'Odaberite datoteke'}
        </button>
      </div>
    </>
  );
}

/**
 * Inline upload button component za korištenje u header-ima
 */
export function InlineUploadButton({ onFileUpload, isUploading, className = '' }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((files) => {
    if (!files?.length) return;
    onFileUpload?.(Array.from(files));
  }, [onFileUpload]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        multiple
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`
          px-4 py-2 bg-blue-600 text-white rounded-lg 
          hover:bg-blue-700 transition-colors flex items-center gap-2
          disabled:bg-gray-400 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <Plus className="w-4 h-4" />
        {isUploading ? 'Učitavanje...' : 'Dodaj datoteke'}
      </button>
    </>
  );
}