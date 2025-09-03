import React from "react";
import JsonViewer from "./JsonViewer";

export default function PipelineViewer({ draftJson, finalJson, logs, loading }) {
  const steps = [
    { id: "voice_capture", name: "Glasovni unos", icon: "🎤" },
    { id: "transcript", name: "Transkript", icon: "📝" },
    { id: "draft_llm", name: "LLM Draft", icon: "🤖" },
    { id: "user_review", name: "Korisnikov pregled", icon: "👤" },
    { id: "confirm_llm", name: "LLM Potvrda", icon: "✅" },
    { id: "executor", name: "Izvršavanje", icon: "⚡" }
  ];

  const getCurrentStep = () => {
    if (finalJson && finalJson.flags?.confirmed) return "executor";
    if (finalJson) return "confirm_llm";
    if (draftJson) return "user_review";
    if (loading) return "draft_llm";
    if (logs.length > 0) return "transcript";
    return "voice_capture";
  };

  const currentStep = getCurrentStep();

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Pipeline Steps */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-3">Pipeline koraci</h4>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                  isActive 
                    ? "bg-blue-100 text-blue-800 border border-blue-200" 
                    : isCompleted
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500"
                }`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="font-medium">{step.name}</span>
                {isActive && loading && (
                  <div className="ml-auto">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
                {isCompleted && (
                  <span className="ml-auto text-green-600">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-50 p-4 rounded-lg flex-1 min-h-0">
        <h4 className="font-semibold text-gray-800 mb-3">Activity log</h4>
        <div className="overflow-y-auto h-full space-y-1">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Nema aktivnosti...</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="text-sm p-2 rounded bg-white border-l-2 border-gray-300"
              >
                <span className="text-gray-600 text-xs">
                  {new Date().toLocaleTimeString()}
                </span>
                <p className="text-gray-800">{log}</p>
              </div>
            ))
          )}
          {loading && (
            <div className="text-sm p-2 rounded bg-yellow-50 border-l-2 border-yellow-400 animate-pulse">
              <span className="text-yellow-600 text-xs">
                {new Date().toLocaleTimeString()}
              </span>
              <p className="text-yellow-800">⏳ Obrađujem zahtjev...</p>
            </div>
          )}
        </div>
      </div>

      {/* JSON Responses */}
      {(draftJson || finalJson) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-3">LLM odgovori</h4>
          
          {draftJson && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded font-medium">
                  DRAFT
                </span>
                <span className="text-sm text-gray-600">Status: {draftJson.status}</span>
              </div>
              <JsonViewer data={draftJson} />
            </div>
          )}
          
          {finalJson && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded font-medium">
                  FINAL
                </span>
                <span className="text-sm text-gray-600">Status: {finalJson.status}</span>
                {finalJson.flags?.confirmed && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                    POTVRĐENO
                  </span>
                )}
              </div>
              <JsonViewer data={finalJson} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}