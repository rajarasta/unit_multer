import React, { useState, useRef, useCallback } from "react";

export default function VoiceRecorder({ onTranscript, loading }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const audioChunks = useRef([]);

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
        
        console.log('🎤 Audio recorded, sending to Whisper...', audioBlob.size, 'bytes');
        
        // Prepare FormData for Whisper API
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        
        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          const { text, fallback_text } = await res.json();
          const transcript = text || fallback_text || "Greška pri transkripciji";
          
          console.log('✅ Whisper transcript:', transcript);
          onTranscript(transcript);
          
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

  return (
    <div className="text-center space-y-4">
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