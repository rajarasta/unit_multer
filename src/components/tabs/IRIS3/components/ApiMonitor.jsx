/**
 * IRIS3 API Monitor Component
 * Right sidebar with chat history and API monitoring
 * Local to IRIS3 tab - UI only, no business logic
 */

import React from 'react';

const ApiMonitor = ({
  chatHistory = [],
  apiData = { lastPayload: null, lastResponse: null, timestamp: null }
}) => {
  return (
    <div className="w-1/4 panel border-l border-theme">
      <div className="h-full flex flex-col">
        <div className="input-bg px-4 py-3 border-b border-theme">
          <h2 className="text-lg font-semibold text-primary">API Monitor</h2>
          <p className="text-xs text-secondary mt-1">Real-time API communication</p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="text-xs text-secondary font-semibold border-b border-theme pb-1">
              Chat Povijest ({chatHistory.length})
            </div>
            
            {chatHistory.map((entry) => (
              <div key={entry.id} className="space-y-2 pb-3 border-b border-theme/30">
                <div className="text-xs text-secondary font-mono">
                  {entry.timestamp} | {entry.activeTab}
                </div>
                <div className="text-xs">
                  <span className="font-medium text-accent">User:</span>
                  <div className="text-primary mt-1 pl-2 border-l-2 border-accent/30">
                    {entry.user}
                  </div>
                </div>
                <div className="text-xs">
                  <span className="font-medium text-accent">
                    {entry.isToolCall ? 'Tool Call:' : 'Assistant:'}
                  </span>
                  <div className={`mt-1 pl-2 border-l-2 ${
                    entry.isError 
                      ? 'text-red-600 border-red-300' 
                      : entry.isToolCall 
                      ? 'text-blue-600 border-blue-300' 
                      : 'text-primary border-accent/30'
                  }`}>
                    {entry.assistant}
                  </div>
                </div>
              </div>
            ))}
            
            {apiData.timestamp && (
              <div className="space-y-3 mt-4 pt-4 border-t border-theme">
                <div className="text-xs text-secondary font-semibold">
                  Zadnji API poziv ({apiData.timestamp})
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-accent mb-2">Payload:</h3>
                  <pre className="text-xs input-bg border border-theme p-2 rounded overflow-x-auto text-primary">
                    {JSON.stringify(apiData.lastPayload, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-accent mb-2">Response:</h3>
                  <pre className="text-xs input-bg border border-theme p-2 rounded overflow-x-auto text-primary">
                    {JSON.stringify(apiData.lastResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {chatHistory.length === 0 && !apiData.timestamp && (
              <div className="text-center text-secondary mt-8">
                <p className="text-sm">Nema chat povijesti</p>
                <p className="text-xs mt-2 opacity-60">Aktivirajte mikrofon za početak razgovora</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiMonitor;