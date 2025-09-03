import React from 'react';

const DocumentThumbnail = ({ type, name, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-10',
    md: 'w-12 h-16',
    lg: 'w-16 h-20'
  };

  const getDocumentStyles = (docType) => {
    const baseStyles = `${sizeClasses[size]} rounded border-2 flex items-center justify-center text-white font-bold relative overflow-hidden shadow-sm`;
    
    switch (docType?.toLowerCase()) {
      case 'pdf':
        return {
          container: `${baseStyles} bg-gradient-to-br from-red-500 to-red-600 border-red-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-red-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">PDF</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">ADOBE</div>}
              </div>
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-red-300"></div>
            </>
          )
        };
      
      case 'xlsx':
      case 'xls':
        return {
          container: `${baseStyles} bg-gradient-to-br from-green-500 to-green-600 border-green-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-green-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">XLS</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">EXCEL</div>}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-300 to-green-400 opacity-60"></div>
            </>
          )
        };
      
      case 'docx':
      case 'doc':
        return {
          container: `${baseStyles} bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-blue-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">DOC</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">WORD</div>}
              </div>
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-400 opacity-60"></div>
            </>
          )
        };
      
      case 'png':
      case 'jpg':
      case 'jpeg':
        return {
          container: `${baseStyles} bg-gradient-to-br from-purple-500 to-purple-600 border-purple-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-purple-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">IMG</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">IMAGE</div>}
              </div>
              <div className="absolute inset-2 border border-purple-300 opacity-40 rounded"></div>
            </>
          )
        };
      
      case 'txt':
        return {
          container: `${baseStyles} bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-gray-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">TXT</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">TEXT</div>}
              </div>
              <div className="absolute inset-1 border-l border-gray-300 opacity-40 ml-1"></div>
            </>
          )
        };
      
      default:
        return {
          container: `${baseStyles} bg-gradient-to-br from-slate-500 to-slate-600 border-slate-400`,
          content: (
            <>
              <div className="absolute inset-0 bg-slate-600 opacity-90"></div>
              <div className="relative z-10 text-center">
                <div className="text-xs font-bold">FILE</div>
                {size !== 'sm' && <div className="text-[6px] opacity-80 mt-0.5">DOCUMENT</div>}
              </div>
            </>
          )
        };
    }
  };

  const { container, content } = getDocumentStyles(type);

  return (
    <div 
      className={container}
      title={name || `${type?.toUpperCase()} document`}
    >
      {content}
    </div>
  );
};

export default DocumentThumbnail;