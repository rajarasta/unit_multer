import React, { useState } from "react";

export default function JsonViewer({ data }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!data) return null;

  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400">JSON Response</span>
        <button
          onClick={toggleCollapsed}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          {collapsed ? "Prikaži" : "Sakrij"}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3 max-h-64 overflow-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {/* Collapsed view - show key info */}
      {collapsed && (
        <div className="p-3 text-xs">
          <div className="space-y-1">
            {data.action && (
              <div>
                <span className="text-blue-400">action:</span> {data.action}
              </div>
            )}
            {data.status && (
              <div>
                <span className="text-green-400">status:</span> {data.status}
              </div>
            )}
            {data.document_id && (
              <div>
                <span className="text-yellow-400">document_id:</span> {data.document_id}
              </div>
            )}
            {data.flags?.confirmed !== undefined && (
              <div>
                <span className="text-purple-400">confirmed:</span> {String(data.flags.confirmed)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}