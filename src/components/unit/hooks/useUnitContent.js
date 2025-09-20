import { useState, useCallback } from 'react';

export default function useUnitContent(onInput) {
  const [textInputValue, setTextInputValue] = useState('');

  const detectInputType = useCallback((input) => {
    console.log('🔍 detectInputType called with:', input);
    
    if (input && (input.constructor?.name === 'FileList' || input.constructor?.name === 'File' || input.type !== undefined)) {
      const file = input.constructor?.name === 'FileList' ? input[0] : input;
      console.log('📁 Processing file:', file.name, 'type:', file.type);
      
      if (file.type?.startsWith?.('image/')) {
        const result = file.type.includes('svg') ? 'svg' : 'image';
        console.log('🖼️ Detected as image:', result);
        return result;
      }
      if (file.type === 'application/pdf') {
        console.log('📄 Detected as pdf');
        return 'pdf';
      }
      // Check for Excel/spreadsheet files BEFORE xml check (xlsx files contain xml)
      if (file.type?.includes?.('sheet') || 
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.name?.endsWith?.('.xlsx') || 
          file.name?.endsWith?.('.csv') || 
          file.name?.endsWith?.('.xls')) {
        console.log('📊 Detected as table');
        return 'table';
      }
      if (file.name?.endsWith?.('.xml') || file.type?.includes?.('xml')) {
        console.log('🔖 Detected as xml');
        return 'xml';
      }
      if (file.name?.endsWith?.('.dwg') || file.name?.endsWith?.('.dxf')) {
        console.log('📐 Detected as dwg');
        return 'dwg';
      }
      if (file.type?.includes?.('text') || file.name?.endsWith?.('.txt') || file.name?.endsWith?.('.md')) {
        console.log('📝 Detected as textfile');
        return 'textfile';
      }
      if (file.type?.includes?.('word') || file.name?.endsWith?.('.doc') || file.name?.endsWith?.('.docx')) {
        console.log('📄 Detected as document');
        return 'document';
      }
      console.log('📁 Detected as generic file');
      return 'file';
    }
    
    if (typeof input === 'string') {
      if (input.trim().includes('\t') || input.includes(',')) {
        console.log('📊 Detected string as table');
        return 'table';
      }
      if (input.includes('<') && input.includes('>')) {
        console.log('🔖 Detected string as xml');
        return 'xml';
      }
      console.log('📝 Detected string as text');
      return 'text';
    }
    
    console.log('🔄 Detected as empty');
    return 'empty';
  }, []);

  const handleFileChange = useCallback((e) => {
    const files = e?.target?.files;
    if (files && files.length > 0 && onInput) {
      onInput(files[0]);
    }
  }, [onInput]);

  const handleTextChange = useCallback((e) => {
    setTextInputValue(e.target.value);
  }, []);

  const handleTextKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = textInputValue.trim();
      if (text && onInput) {
        onInput(text);
        setTextInputValue('');

        // Small delay to allow Unit type transition, then dispatch focus event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('unit-text-focus-request', {
            detail: { unitType: 'text' }
          }));
        }, 100);
      }
    }
  }, [textInputValue, onInput]);

  return {
    textInputValue,
    setTextInputValue,
    detectInputType,
    handleFileChange,
    handleTextChange,
    handleTextKeyPress
  };
}

