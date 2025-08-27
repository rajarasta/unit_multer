// components/Header/SettingsPanel.jsx
import React from 'react';
import { X, Settings } from 'lucide-react';

export function SettingsPanel({ settings, onSettingsChange, onClose }) {
  const local = { ...settings };
  
  return (
    <div className="fixed right-4 top-20 z-40 w-80 bg-white rounded-xl shadow-2xl border">
      <style>{`
        .pulse-strong { 
          animation: pulseStrong 1s ease-in-out infinite; 
        }
        @keyframes pulseStrong {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        .glow-critical {
          animation: glowCritical 1.5s ease-in-out infinite;
        }
        @keyframes glowCritical {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.6); }
        }
        .glow-high {
          animation: glowHigh 2s ease-in-out infinite;
        }
        @keyframes glowHigh {
          0%, 100% { box-shadow: 0 0 15px rgba(245,158,11,0.5), 0 0 30px rgba(245,158,11,0.3); }
          50% { box-shadow: 0 0 25px rgba(245,158,11,0.7), 0 0 50px rgba(245,158,11,0.5); }
        }
        .glow-medium {
          animation: glowMedium 2.5s ease-in-out infinite;
        }
        @keyframes glowMedium {
          0%, 100% { box-shadow: 0 0 10px rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.4); }
        }
        .rainbow-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%);
        }
      `}</style>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Postavke prikaza</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Prikaz u trakama
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showPositionInBar}
                  onChange={(e) => onSettingsChange({ ...local, showPositionInBar: e.target.checked })}
                  className="rounded"
                />
                Prikaži poziciju u traci
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showIconsInBar}
                  onChange={(e) => onSettingsChange({ ...local, showIconsInBar: e.target.checked })}
                  className="rounded"
                />
                Ikone procesa u traci
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.openEditorOnTrayClick}
                  onChange={(e) => onSettingsChange({ ...local, openEditorOnTrayClick: e.target.checked })}
                  className="rounded"
                />
                Klik na traku otvara UREDI ZADATAK
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showUrgencyGlow}
                  onChange={(e) => onSettingsChange({ ...local, showUrgencyGlow: e.target.checked })}
                  className="rounded"
                />
                Prikaži sjaj hitnih zadataka
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.useProjectColors}
                  onChange={(e) => onSettingsChange({ ...local, useProjectColors: e.target.checked })}
                  className="rounded"
                />
                Boje (Uklj = Projektne boje, Isklj = Boje procesa)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Indikatori statusa
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showStatusIndicators}
                  onChange={(e) => onSettingsChange({ ...local, showStatusIndicators: e.target.checked })}
                  className="rounded"
                />
                Prikaži indikatore (komentari, prilozi, opis, podzadaci)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showProgressPercentage}
                  onChange={(e) => onSettingsChange({ ...local, showProgressPercentage: e.target.checked })}
                  className="rounded"
                />
                Prikaži postotak napretka
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Performanse
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={local.enableAnimations}
                onChange={(e) => onSettingsChange({ ...local, enableAnimations: e.target.checked })}
                className="rounded"
              />
              Omogući animacije
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}