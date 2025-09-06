import React from 'react';

export default function JsonHighlighter({ data }) {
  return (
    <pre className="text-xs code-font input-bg rounded-lg p-4 overflow-auto h-full border-theme border text-secondary">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

