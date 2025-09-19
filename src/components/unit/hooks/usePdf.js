import { useState, useCallback } from 'react';

export default function usePdf() {
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setPdfNumPages(numPages);
  }, []);

  return {
    pdfNumPages,
    setPdfNumPages,
    pdfPageNumber,
    setPdfPageNumber,
    onDocumentLoadSuccess
  };
}
