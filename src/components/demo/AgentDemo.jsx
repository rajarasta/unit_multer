import React, { useState } from 'react';
import { useAgentStream, useAgentMulti, useSmartRoute } from '../../hooks/useAgentStream';

export default function AgentDemo() {
  const [activeTab, setActiveTab] = useState('stream');
  
  // Stream demo
  const [streamTasks, setStreamTasks] = useState([
    { prompt: "Kreiraj ponudu za aluminijske prozore" },
    { prompt: "Izračunaj troškove materijala" },
    { prompt: "Generiraj raspored rada" }
  ]);
  
  // Multi demo
  const [multiFiles, setMultiFiles] = useState([]);
  const [multiTasks, setMultiTasks] = useState([]);
  
  // Smart route demo
  const [routePrompt, setRoutePrompt] = useState('');
  const [routeFile, setRouteFile] = useState(null);

  // Hook instanciranje
  const streamHook = useAgentStream(
    streamTasks,
    (data) => console.log('Stream result:', data),
    (error) => console.error('Stream error:', error),
    () => console.log('Stream complete!')
  );

  const multiHook = useAgentMulti();
  const routeHook = useSmartRoute();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 AI Agent Demo</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        {['stream', 'multi', 'route'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'stream' && '🌊 Stream'}
            {tab === 'multi' && '🚀 Multi-Task'} 
            {tab === 'route' && '🧠 Smart Route'}
          </button>
        ))}
      </div>

      {/* Stream Tab */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🌊 Real-time Streaming</h2>
          <p className="text-gray-600">
            Rezultati se prikazuju čim stignu s backend-a
          </p>
          
          <div className="space-y-2">
            {streamTasks.map((task, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="text-sm font-mono w-8">{i + 1}.</span>
                <input
                  value={task.prompt}
                  onChange={(e) => setStreamTasks(prev => 
                    prev.map((t, idx) => idx === i ? { ...t, prompt: e.target.value } : t)
                  )}
                  className="flex-1 px-3 py-2 border rounded"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={streamHook.startStream}
              disabled={streamHook.isStreaming}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {streamHook.isStreaming ? '🌊 Streaming...' : '▶️ Start Stream'}
            </button>
            
            {streamHook.isStreaming && (
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${streamHook.progress}%` }}
                />
              </div>
            )}
            <span className="text-sm text-gray-600">{streamHook.progress}%</span>
          </div>

          {/* Stream Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {streamHook.results.map((result, i) => (
              <div key={i} className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-green-600 font-mono text-sm">
                    ✅ Task {result.taskIndex}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {result.result?.type}
                  </span>
                </div>
                <div className="text-sm">
                  {result.result?.text?.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Task Tab */}
      {activeTab === 'multi' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🚀 Batch Processing</h2>
          <p className="text-gray-600">
            Svi taskovi se izvršavaju paralelno
          </p>

          <div className="space-y-2">
            <button
              onClick={() => setMultiTasks(prev => [...prev, { prompt: '' }])}
              className="px-3 py-1 bg-gray-200 text-sm rounded"
            >
              + Dodaj task
            </button>
            
            {multiTasks.map((task, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="text-sm font-mono w-8">{i + 1}.</span>
                <input
                  value={task.prompt}
                  onChange={(e) => setMultiTasks(prev => 
                    prev.map((t, idx) => idx === i ? { ...t, prompt: e.target.value } : t)
                  )}
                  placeholder="Unesite zadatak..."
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="file"
                  onChange={(e) => {
                    const newFiles = [...multiFiles];
                    newFiles[i] = e.target.files[0];
                    setMultiFiles(newFiles);
                  }}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => multiHook.processTasks(multiTasks, multiFiles)}
            disabled={multiHook.isProcessing || multiTasks.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            {multiHook.isProcessing ? '⏳ Processing...' : '🚀 Process All'}
          </button>

          {/* Multi Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {multiHook.results.map((result, i) => (
              <div key={i} className={`p-3 rounded border-l-4 ${
                result.status === 'fulfilled' 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-red-50 border-red-400'
              }`}>
                <div className="font-mono text-sm mb-1">
                  {result.status === 'fulfilled' ? '✅' : '❌'} Task {result.taskIndex}
                </div>
                {result.data && (
                  <div className="text-sm">
                    {JSON.stringify(result.data, null, 2).substring(0, 200)}...
                  </div>
                )}
                {result.error && (
                  <div className="text-red-600 text-sm">{result.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Route Tab */}
      {activeTab === 'route' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🧠 Smart Routing</h2>
          <p className="text-gray-600">
            Automatski prepoznaje tip inputa (tekst/audio/slika) → odabir modela
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Prompt/Tekst</label>
              <textarea
                value={routePrompt}
                onChange={(e) => setRoutePrompt(e.target.value)}
                placeholder="Unesite upit ili ostavite prazno za analizu datoteke..."
                rows={3}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Datoteka (audio/slika)</label>
              <input
                type="file"
                accept="audio/*,image/*"
                onChange={(e) => setRouteFile(e.target.files[0])}
                className="w-full"
              />
            </div>

            <button
              onClick={() => routeHook.route(routePrompt, routeFile)}
              disabled={routeHook.isProcessing || (!routePrompt && !routeFile)}
              className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
            >
              {routeHook.isProcessing ? '🤔 Processing...' : '🧠 Smart Route'}
            </button>
          </div>

          {/* Route Result */}
          {routeHook.result && (
            <div className="p-4 bg-purple-50 border-l-4 border-purple-400 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold">🎯 Routing Result:</span>
                <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
                  {routeHook.result.type}
                </span>
              </div>
              
              {routeHook.result.type === 'transcript' && (
                <div>
                  <strong>Transcript:</strong> {routeHook.result.text}
                </div>
              )}
              
              {routeHook.result.type === 'image_analysis' && (
                <div>
                  <strong>Image Analysis:</strong> {routeHook.result.text}
                </div>
              )}
              
              {routeHook.result.type === 'text' && (
                <pre className="text-sm bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(routeHook.result.json, null, 2)}
                </pre>
              )}
              
              {routeHook.result.type === 'error' && (
                <div className="text-red-600">
                  <strong>Error:</strong> {routeHook.result.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}