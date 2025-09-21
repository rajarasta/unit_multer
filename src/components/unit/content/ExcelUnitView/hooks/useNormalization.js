import { useState, useCallback } from 'react';

const useNormalization = (parsedData, activeSheet, setError) => {
  // Normalization states
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizedData, setNormalizedData] = useState(null);
  const [diffMeta, setDiffMeta] = useState({});
  const [normalizedXlsxUrl, setNormalizedXlsxUrl] = useState(null);
  const [updatedRows, setUpdatedRows] = useState({});

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

  // Normalization function
  const onNormalize = useCallback(async () => {
    if (!parsedData || !activeSheet) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Normalize failed ${resp.status}: ${errorText}`);
      }

      const body = await resp.json();
      console.log('✅ Normalization response:', body);
      handleNormalizedResponse(body);

    } catch (err) {
      console.error('❌ Normalize failed:', err);
      setError(err.message || String(err));
    } finally {
      setIsNormalizing(false);
    }
  }, [parsedData, activeSheet, setError]);

  const handleNormalizedResponse = useCallback((payload) => {
    if (!payload || !payload.normalized) {
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
    if (payload.xlsxBase64) {
      const blob = b64toBlob(payload.xlsxBase64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const url = URL.createObjectURL(blob);
      setNormalizedXlsxUrl(url);
    }

    console.log('🎯 Normalization complete. Updated rows:', Object.keys(newUpdatedRows).length);
  }, [b64toBlob, setError]);

  return {
    // State
    isNormalizing,
    normalizedData,
    diffMeta,
    normalizedXlsxUrl,
    updatedRows,
    setUpdatedRows,

    // Actions
    onNormalize,
    handleNormalizedResponse
  };
};

export default useNormalization;