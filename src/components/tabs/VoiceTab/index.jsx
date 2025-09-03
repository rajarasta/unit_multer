import React, { useState } from "react";
import VoiceRecorder from "./VoiceRecorder";
import PipelineViewer from "./PipelineViewer";
import FormPreview from "./FormPreview";

export default function VoiceTab() {
  const [transcript, setTranscript] = useState("");
  const [draftJson, setDraftJson] = useState(null);
  const [finalJson, setFinalJson] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleTranscript = async (text) => {
    setTranscript(text);
    setLoading(true);
    setLogs((prev) => [...prev, "📤 Šaljem draft na OpenAI"]);

    try {
      const res = await fetch("http://localhost:3001/api/llm/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setDraftJson(data);
      setLogs((prev) => [...prev, "✅ Draft JSON vraćen"]);
    } catch (error) {
      console.error("Draft error:", error);
      setLogs((prev) => [...prev, `❌ Greška: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (fields) => {
    setLoading(true);
    setLogs((prev) => [...prev, "📤 Šaljem potvrdu na OpenAI"]);

    try {
      const res = await fetch("http://localhost:3001/api/llm/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: transcript, fields }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setFinalJson(data);
      setLogs((prev) => [...prev, "✅ Final JSON vraćen"]);
      
      // Simulacija izvršavanja
      setTimeout(() => {
        setLogs((prev) => [...prev, "🔄 Izvršavam akciju...", "✅ Akcija završena"]);
      }, 1000);
    } catch (error) {
      console.error("Confirm error:", error);
      setLogs((prev) => [...prev, `❌ Greška: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranscript("");
    setDraftJson(null);
    setFinalJson(null);
    setLogs([]);
  };

  return (
    <div className="h-full p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glasovni Agent</h1>
          <p className="text-gray-600 mt-1">OpenAI Agent pipeline za glasovne naredbe</p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
        >
          🔄 Reset
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* Lijevi panel - Voice Input */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm h-fit">
            <h3 className="font-semibold text-gray-800 mb-4">🎤 Glasovni unos</h3>
            <VoiceRecorder onTranscript={handleTranscript} loading={loading} />
          </div>

          {transcript && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-2">Transkript</h4>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border-l-4 border-blue-400">
                {transcript}
              </div>
            </div>
          )}
        </div>

        {/* Centralni panel - Pipeline Viewer */}
        <div className="col-span-5">
          <div className="bg-white p-4 rounded-lg shadow-sm h-full">
            <h3 className="font-semibold text-gray-800 mb-4">⚡ Pipeline pregled</h3>
            <PipelineViewer
              draftJson={draftJson}
              finalJson={finalJson}
              logs={logs}
              loading={loading}
            />
          </div>
        </div>

        {/* Desni panel - Form Preview */}
        <div className="col-span-4">
          {draftJson ? (
            <div className="bg-white p-4 rounded-lg shadow-sm h-full">
              <h3 className="font-semibold text-gray-800 mb-4">📝 Pregled i uređivanje</h3>
              <FormPreview 
                draft={draftJson} 
                onConfirm={handleConfirm}
                loading={loading}
              />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">🎯</div>
                <p>Snimite glasovnu naredbu da počnete</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}