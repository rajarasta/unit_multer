import React, { forwardRef } from 'react';
import { Settings, ChevronDown, Key, Cpu, Eye, Wrench } from 'lucide-react';
import { AI_MODES, GOOGLE_MODELS, GOOGLE_MODEL_LABELS } from '../../constants/aiModes';

/**
 * SettingsDropdown - Komponenta za AI i processing settings
 * 
 * @param {Object} settings - Trenutni settings
 * @param {Function} onSettingUpdate - Callback za update setting-a
 * @param {Function} onTestConnection - Callback za testiranje konekcije
 * @param {boolean} isOpen - Da li je dropdown otvoren
 * @param {Function} onToggle - Callback za toggle dropdown
 * @param {boolean} isProcessing - Da li je u toku procesiranje
 */
const SettingsDropdown = forwardRef(({ 
  settings, 
  onSettingUpdate, 
  onTestConnection, 
  isOpen, 
  onToggle, 
  isProcessing 
}, ref) => {
  
  const currentModelLabel = GOOGLE_MODEL_LABELS[settings.selectedModel] || settings.selectedModel;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        disabled={isProcessing}
        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Settings className="w-4 h-4" />
        <span className="truncate flex-1 text-left">{currentModelLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            
            {/* API Key Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-medium">Google AI API</h4>
              </div>
              <input
                type="password"
                value={settings.googleApiKey}
                onChange={(e) => onSettingUpdate('googleApiKey', e.target.value)}
                placeholder={import.meta.env.VITE_GOOGLE_AI_API_KEY ? "Koristi se .env ključ" : "Unesite API ključ"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
              {!settings.googleApiKey && !import.meta.env.VITE_GOOGLE_AI_API_KEY && (
                <p className="text-xs text-red-600 mt-1">
                  API ključ je potreban za analizu
                </p>
              )}
            </div>

            {/* Model Selection */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-medium">AI Model</h4>
              </div>
              <select
                value={settings.selectedModel}
                onChange={(e) => onSettingUpdate('selectedModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                {Object.entries(GOOGLE_MODEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pro modeli omogućavaju bolju analizu dokumenata
              </p>
            </div>

            {/* Analysis Mode */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-medium">Način analize</h4>
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="radio"
                    name="analysisMode"
                    value={AI_MODES.CLOUD_GOOGLE_PDF}
                    checked={settings.analysisMode === AI_MODES.CLOUD_GOOGLE_PDF}
                    onChange={(e) => onSettingUpdate('analysisMode', e.target.value)}
                    className="mr-2 text-blue-600"
                    disabled={isProcessing}
                  />
                  <span>📄 PDF Analiza</span>
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="radio"
                    name="analysisMode"
                    value={AI_MODES.CLOUD_GOOGLE_VISION}
                    checked={settings.analysisMode === AI_MODES.CLOUD_GOOGLE_VISION}
                    onChange={(e) => onSettingUpdate('analysisMode', e.target.value)}
                    className="mr-2 text-blue-600"
                    disabled={isProcessing}
                  />
                  <span>👁️ Vision Analiza</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vision analiza može biti precizija za slike
              </p>
            </div>

            {/* Processing Options */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-medium">Obrada</h4>
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span>Automatska analiza</span>
                  <input
                    type="checkbox"
                    checked={settings.autoAnalyze}
                    onChange={(e) => onSettingUpdate('autoAnalyze', e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                    disabled={isProcessing}
                  />
                </label>
                <label className="flex items-center justify-between text-sm">
                  <span>Jednostavan UI</span>
                  <input
                    type="checkbox"
                    checked={settings.simpleUI}
                    onChange={(e) => onSettingUpdate('simpleUI', e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>

            {/* Test Connection */}
            <div className="pt-2 border-t">
              <button
                onClick={onTestConnection}
                disabled={isProcessing}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Testira...' : 'Test konekcije'}
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Provjeri da li API ključ i model rade
              </p>
            </div>

            {/* Current Config Summary */}
            <div className="pt-2 border-t bg-gray-50 -m-4 p-4 rounded-b-lg">
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <strong>Model:</strong> {currentModelLabel}
                </div>
                <div>
                  <strong>Analiza:</strong> {settings.analysisMode === AI_MODES.CLOUD_GOOGLE_PDF ? 'PDF' : 'Vision'}
                </div>
                <div>
                  <strong>Auto-procesiranje:</strong> {settings.autoAnalyze ? 'Da' : 'Ne'}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
});

SettingsDropdown.displayName = 'SettingsDropdown';

export default SettingsDropdown;