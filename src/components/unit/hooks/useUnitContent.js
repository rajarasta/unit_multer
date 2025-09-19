import { useState, useCallback } from 'react';

export default function useUnitContent(onInput) {
  const [textInputValue, setTextInputValue] = useState('');

  const detectInputType = useCallback((input) => {
    if (input && (input.constructor?.name === 'FileList' || input.constructor?.name === 'File' || input.type !== undefined)) {
      const file = input.constructor?.name === 'FileList' ? input[0] : input;
      if (file.type?.startsWith?.('image/')) {
        return file.type.includes('svg') ? 'svg' : 'image';
      }
      if (file.type === 'application/pdf') return 'pdf';
      if (file.name?.endsWith?.('.xml') || file.type?.includes?.('xml')) return 'xml';
      if (file.name?.endsWith?.('.dwg') || file.name?.endsWith?.('.dxf')) return 'dwg';
      if (file.type?.includes?.('sheet') || file.name?.endsWith?.('.xlsx') || file.name?.endsWith?.('.csv') || file.name?.endsWith?.('.xls')) return 'table';
      if (file.type?.includes?.('text') || file.name?.endsWith?.('.txt') || file.name?.endsWith?.('.md')) return 'textfile';
      if (file.type?.includes?.('word') || file.name?.endsWith?.('.doc') || file.name?.endsWith?.('.docx')) return 'document';
      return 'file';
    }
    if (typeof input === 'string') {
      if (input.trim().includes('\t') || input.includes(',')) return 'table';
      if (input.includes('<') && input.includes('>')) return 'xml';
      return 'text';
    }
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

