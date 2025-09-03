import React, { useState, useEffect } from "react";

export default function FormPreview({ draft, onConfirm, loading }) {
  const [fields, setFields] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (draft?.fields) {
      setFields(draft.fields);
    }
    if (draft?.attachments) {
      setAttachments(draft.attachments);
    }
  }, [draft]);

  const handleFieldChange = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        // Handle images separately for multimodal processing
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          setImages(prev => [...prev, {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            data: base64,
            url: URL.createObjectURL(file)
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        // Handle regular attachments
        const newAttachment = {
          name: file.name,
          size: file.size,
          type: file.type,
          source: "local",
          url: URL.createObjectURL(file)
        };
        setAttachments(prev => [...prev, newAttachment]);
      }
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const finalData = {
      ...fields,
      attachments: attachments,
      images: images // Include images for multimodal processing
    };
    onConfirm(finalData);
  };

  const reprocessWithImages = async () => {
    if (images.length === 0) return;
    
    // Call draft API again with images for enhanced analysis
    try {
      const response = await fetch('http://localhost:3001/api/llm/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: `Analiziraj uploadane slike i ažuriraj podatke: ${draft?.fields?.description || ''}`,
          images: images.map(img => ({ data: img.data, mimeType: img.mimeType }))
        })
      });
      
      if (response.ok) {
        const updatedDraft = await response.json();
        // Update fields with detected data
        if (updatedDraft.fields) {
          setFields(prev => ({ ...prev, ...updatedDraft.fields }));
        }
      }
    } catch (error) {
      console.error('Reprocess error:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!draft) return null;

  const needsManualInput = draft.flags?.needs_manual_input || [];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Akcija info */}
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎯</span>
          <div>
            <h4 className="font-semibold text-blue-800">
              {draft.action?.replace(/_/g, ' ').toUpperCase()}
            </h4>
            {draft.document_id && (
              <p className="text-sm text-blue-600">
                Dokument: {draft.document_id}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <h4 className="font-semibold text-gray-800">Podaci</h4>
        
        {Object.keys(fields).length === 0 ? (
          <p className="text-gray-500 text-sm italic">Nema podataka za uređivanje</p>
        ) : (
          Object.entries(fields).map(([key, value]) => {
            const isRequired = needsManualInput.includes(key);
            const isEmpty = !value || value === "";
            
            return (
              <div key={key} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                <input
                  type={key.includes('date') ? 'date' : key.includes('amount') ? 'number' : 'text'}
                  value={value || ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className={`w-full p-2 border rounded-lg text-sm transition-colors ${
                    isEmpty && isRequired
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  placeholder={isRequired ? 'Obavezno polje' : 'Unesite vrijednost...'}
                />
                
                {isEmpty && isRequired && (
                  <p className="text-xs text-red-600">⚠️ Ovo polje je obavezno</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Attachments */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800">Prilozi</h4>
        
        {/* Upload zona */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-gray-600">
              <span className="text-2xl">📎</span>
              <p className="text-sm mt-1">Dodaj datoteke</p>
              <p className="text-xs text-gray-500">PDF, Word, slike</p>
            </div>
          </label>
        </div>

        {/* Images Section */}
        {images.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-700">🖼️ Slike ({images.length})</h5>
              {images.length > 0 && (
                <button
                  onClick={reprocessWithImages}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  🔄 Analiziraj slike
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-20 object-cover rounded border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b truncate">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Analysis Results */}
        {draft?.image_analysis && (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <h5 className="text-sm font-medium text-green-800 mb-2">🔍 Analiza slika</h5>
            {draft.image_analysis.detected_text && (
              <div className="mb-2">
                <p className="text-xs text-green-700 font-medium">Pronađeni tekst:</p>
                <p className="text-xs text-green-600 bg-white p-2 rounded border">
                  {draft.image_analysis.detected_text}
                </p>
              </div>
            )}
            {draft.image_analysis.document_type && (
              <p className="text-xs text-green-700">
                <span className="font-medium">Tip dokumenta:</span> {draft.image_analysis.document_type}
              </p>
            )}
          </div>
        )}

        {/* Lista priloga */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">📄 Dokumenti ({attachments.length})</h5>
            <div className="max-h-32 overflow-y-auto">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="text-sm">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attachment.size ? formatBytes(attachment.size) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700 text-sm p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Potvrda */}
      <div className="space-y-2 pt-4 border-t">
        {needsManualInput.length > 0 && (
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">
              ⚠️ Potrebno dopuniti: {needsManualInput.join(', ')}
            </p>
          </div>
        )}
        
        <button
          onClick={handleConfirm}
          disabled={loading || (needsManualInput.length > 0 && needsManualInput.some(field => !fields[field]))}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Potvrđujem...</span>
            </span>
          ) : (
            "✅ Potvrdi i izvršava"
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Ili recite: "Jasan zvuk... Potvrdi... Jasan zvuk"
        </p>
      </div>
    </div>
  );
}