import React from 'react';

export default function JsonHighlighter({ data }) {
  if (!data) return <div className="text-xs text-gray-500">— nema odgovora —</div>;

  const renderNode = (node, indent = 0, parentKey = "") => {
    const pad = { paddingLeft: `${indent * 12}px` };

    if (Array.isArray(node)) {
      return (
        <div style={pad}>
          <span className="text-slate-500">[</span>
          {node.map((item, i) => (
            <div key={i}>{renderNode(item, indent + 1, parentKey)}</div>
          ))}
          <div style={pad} className="text-slate-500">]</div>
        </div>
      );
    }

    if (node && typeof node === "object") {
      const isLine = node.id && node.pozicija_id && node.start && node.end;
      const needsReview = node.needs_review === true && node.confirmed === false;
      const source = node.source;
      const lineCls = `${needsReview ? "bg-amber-50 border-amber-200" : ""} ${source === 'normative' || source === 'estimated' ? "ring-1 ring-inset ring-blue-200" : ""} rounded-md border px-2 py-1`;

      return (
        <div style={pad} className={isLine ? lineCls : undefined}>
          {isLine && (
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 rounded text-xs ${node.confirmed ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{node.pozicija_id}</span>
              {!node.confirmed && <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">čeka potvrdu</span>}
              {source && (
                <span className={`px-1 py-0.5 text-xs rounded ${source === 'user' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {source === 'user' ? 'user' : 'llm-gen'}
                </span>
              )}
            </div>
          )}
          {Object.entries(node).map(([k, v]) => (
            <div key={k} className="whitespace-pre-wrap">
              <span className="text-indigo-700">"{k}"</span>
              <span className="text-slate-500">: </span>
              {typeof v === "string" && k === "source" && (v === "normative" || v === "estimated") ? (
                <span className="text-blue-700">"{v}"</span>
              ) : typeof v === "string" && k === "source" && v === "user" ? (
                <span className="text-emerald-700">"{v}"</span>
              ) : typeof v === "boolean" ? (
                <span className={v ? "text-orange-600" : "text-slate-700"}>{String(v)}</span>
              ) : typeof v === "number" ? (
                <span className="text-purple-700">{v}</span>
              ) : typeof v === "string" ? (
                <span className="text-slate-900">"{v}"</span>
              ) : (
                <div>{renderNode(v, indent + 1, k)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof node === "string") return <span className="text-slate-900">"{node}"</span>;
    if (typeof node === "number") return <span className="text-purple-700">{node}</span>;
    if (typeof node === "boolean") return <span className="text-orange-600">{String(node)}</span>;
    if (node == null) return <span className="text-slate-500">null</span>;
    return <span className="text-slate-700">{String(node)}</span>;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">Legenda</span>
        <span className="px-1 rounded bg-amber-50 border border-amber-200">čeka potvrdu</span>
        <span className="px-1 rounded ring-1 ring-inset ring-blue-200">LLM generirano</span>
        <span className="px-1 rounded bg-emerald-50 border border-emerald-200">user</span>
      </div>
      <div className="font-mono text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-60 border">
        {renderNode(data)}
      </div>
    </div>
  );
}