import React, { useState, useRef, useCallback } from "react";
import backendService from "../../../services/BackendService";

export default function VoiceRecorder({ onTranscript, loading }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const audioChunks = useRef([]);
  const fileInputRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunks.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        console.log('🎤 Audio recorded, sending to smart routing API...', audioBlob.size, 'bytes');
        console.log('📁 Additional files:', selectedFiles.length);
        
        // Prepare FormData for Smart Routing API (audio + files)
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        
        // Add additional files if selected
        selectedFiles.forEach((file, index) => {
          formData.append(`attachment_${index}`, file, file.name);
        });
        
        // Add file count for backend processing
        formData.append("fileCount", selectedFiles.length.toString());
        
        try {
          // Try smart document processing endpoint
          let res, result;
          
          try {
            const smartFormData = new FormData();
            smartFormData.append("file", audioBlob, "recording.webm");
            
            result = await backendService.smartDocumentProcessing(smartFormData);
            console.log('🧠 Smart document result:', result);
            
            // Convert to multimodal format for UI consistency
            const smartResult = {
              transcript: { text: result.transcript, type: "transcript" },
              documentMatch: result.matchResult,
              selectedDocument: result.document,
              analysis: result.analysis,
              processing: result.processing,
              stage: result.stage,
              timestamp: result.timestamp
            };
            
            onTranscript(smartResult);
            return;
          } catch (smartError) {
            console.warn('⚠️ Smart document endpoint failed, trying multimodal:', smartError);
          }
          
          // Fallback to multimodal if smart document fails
          try {
            result = await backendService.multimodalProcessing(formData);
            console.log('✅ Multimodal fallback result:', result);
            onTranscript(result);
            return;
          } catch (multimodalError) {
            console.warn('⚠️ Multimodal endpoint failed, falling back to transcribe:', multimodalError);
          }
          
          // Fallback to simple transcription if multimodal fails
          const transcribeFormData = new FormData();
          transcribeFormData.append("file", audioBlob, "recording.webm");
          
          const transcriptionResult = await backendService.transcribeAudio(transcribeFormData);
          const { text, fallback_text } = transcriptionResult;
          const transcript = text || fallback_text || "Greška pri transkripciji";
          
          console.log('✅ Fallback transcript:', transcript);
          
          // Return in multimodal format for consistency
          const fallbackResult = {
            transcript: { text: transcript, type: "transcript" },
            fileAnalyses: selectedFiles.map(f => ({ 
              filename: f.name, 
              analysis: { text: "Datoteka nije analizirana (multimodal endpoint nedostupan)" }
            })),
            combinedAnalysis: null,
            actionItems: [],
            timestamp: new Date().toISOString()
          };
          
          onTranscript(fallbackResult);
          
        } catch (error) {
          console.error("❌ Transcription error:", error);
          
          // Fallback to Croatian construction examples
          const fallbackTranscripts = [
            "Dodaj ponudu za aluminijske prozore",
            "Kreiraj troškovnik za gradnju",
            "Analiziraj dokument sa clouda",
            "Generiraj izvještaj o projektima",
            "Provjeri status radova"
          ];
          
          const fallbackText = fallbackTranscripts[Math.floor(Math.random() * fallbackTranscripts.length)];
          console.log('🔄 Using fallback transcript:', fallbackText);
          onTranscript(`[Fallback] ${fallbackText}`);
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Greška pri pristupu mikrofonu. Molimo omogućite pristup i pokušajte ponovo.");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder]);

  const handleToggleRecord = () => {
    if (loading) return;
    
    if (!recording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    console.log('📁 Files selected:', files.map(f => f.name));
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="text-center space-y-4">
      {/* File picker sekcija */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">📁 Priložite datoteke (opcionalno)</h3>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
        >
          📎 Dodaj datoteke
        </button>
        
        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border text-sm">
                <span className="text-gray-600 truncate flex-1 text-left">
                  📄 {file.name} ({(file.size / 1024).toFixed(1)}KB)
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              {selectedFiles.length} datoteka(e) će biti analizirane s glasovnom naredbom
            </p>
          </div>
        )}
      </div>

      {/* Glavni mikrofon gumb */}
      <button
        onClick={handleToggleRecord}
        disabled={loading}
        className={`w-20 h-20 rounded-full text-white text-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
          recording 
            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
            : loading
            ? "bg-gray-400"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {loading ? "⏳" : recording ? "⏹" : "🎤"}
      </button>

      {/* Status tekst */}
      <div className="text-center">
        {loading && (
          <p className="text-gray-600 text-sm animate-pulse">
            Obrađujem audio...
          </p>
        )}
        {recording && !loading && (
          <p className="text-red-600 text-sm font-medium">
            🔴 Snimam... (kliknite za stop)
          </p>
        )}
        {!recording && !loading && (
          <p className="text-gray-600 text-sm">
            Kliknite za snimanje glasovne naredbe
          </p>
        )}
      </div>

      {/* Audio vizualizacija (placeholder) */}
      {recording && (
        <div className="flex justify-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 rounded-full animate-bounce"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Instrukcije */}
      <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700 border border-blue-200">
        <p className="font-medium mb-1">💡 Savjeti:</p>
        <ul className="text-left space-y-1">
          <li>• Govorite jasno i glasno</li>
          <li>• Početak: "Jasan zvuk..."</li>
          <li>• Kraj: "...Jasan zvuk"</li>
          <li>• Primjer: "Dodaj ponudu 2025-33"</li>
        </ul>
      </div>
    </div>
  );
}