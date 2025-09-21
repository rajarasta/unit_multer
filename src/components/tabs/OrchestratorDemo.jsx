import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Play, FileText, Image, Table, FileSpreadsheet, Wrench, CheckCircle, XCircle, Clock } from 'lucide-react';

// Import orchestrator client
import { createOrchestratorClient } from '../../orchestrator/index.js';

const OrchestratorDemo = () => {
  const [client, setClient] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRun, setCurrentRun] = useState(null);
  const [config, setConfig] = useState({
    model: 'gpt-3.5-turbo',
    baseURL: 'http://localhost:8000/v1',
    apiKey: 'unused'
  });

  // Initialize orchestrator client
  useEffect(() => {
    const initClient = async () => {
      try {
        const orchestratorClient = createOrchestratorClient({
          model: config.model,
          client: {
            baseURL: config.baseURL,
            apiKey: config.apiKey
          }
        });
        
        setClient(orchestratorClient);
        
        // Get tools safely
        const tools = orchestratorClient.getAvailableTools();
        setAvailableTools(tools || []);
      } catch (error) {
        console.error('Failed to initialize orchestrator client:', error);
        setAvailableTools(['ocr_pdf', 'extract_table', 'vlm_describe', 'dwg_parser', 'summarize_docs']); // Fallback
      }
    };
    
    initClient();
  }, [config]);

  // Example message templates
  const exampleMessages = [
    {
      text: "Izvuci tablicu iz Excel filea",
      description: "OCR i analiza Excel dokumenata",
      icon: <Table className="w-4 h-4" />,
      expected_tools: ["extract_table"]
    },
    {
      text: "Analiziraj sliku prozora",
      description: "Vizuelna analiza komponenti",
      icon: <Image className="w-4 h-4" />,
      expected_tools: ["vlm_describe"]
    },
    {
      text: "Obradi PDF dokument",
      description: "OCR ekstrakcija teksta",
      icon: <FileText className="w-4 h-4" />,
      expected_tools: ["ocr_pdf"]
    },
    {
      text: "Parsiraj DWG i usporedi s Excel tabelom",
      description: "Kompleksna analiza CAD i BoQ podataka",
      icon: <FileSpreadsheet className="w-4 h-4" />,
      expected_tools: ["dwg_parser", "extract_table"]
    },
    {
      text: "Sažmi sve dokumente projekta",
      description: "AI sažetak svih dokumenata",
      icon: <FileText className="w-4 h-4" />,
      expected_tools: ["summarize_docs"]
    }
  ];

  const handleSendMessage = async (messageText = input) => {
    if (!client || !messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await client.processMessage(messageText);
      setCurrentRun(result);

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: result.messages[result.messages.length - 1]?.content || 'Obrađeno uspješno',
        metadata: {
          run_id: result.run_id,
          tools_used: result.tools_used,
          context: result.context,
          success: result.success
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `Greška: ${error.message}`,
        metadata: { error: true }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getToolIcon = (toolName) => {
    const icons = {
      ocr_pdf: <FileText className="w-4 h-4" />,
      extract_table: <Table className="w-4 h-4" />,
      vlm_describe: <Image className="w-4 h-4" />,
      dwg_parser: <FileSpreadsheet className="w-4 h-4" />,
      summarize_docs: <FileText className="w-4 h-4" />
    };
    return icons[toolName] || <Wrench className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">AI Orchestrator</h2>
            <p className="text-sm text-slate-500">Tool calling & automation system</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500">
            {availableTools.length} tools available
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Model</label>
            <select 
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="oss-20b-instruct">Local LLM</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Base URL</label>
            <input
              type="text"
              value={config.baseURL}
              onChange={(e) => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
              placeholder="http://localhost:8000/v1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
              placeholder="unused"
            />
          </div>
        </div>
      </div>

      {/* Available Tools */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Available Tools</h3>
        <div className="flex flex-wrap gap-2">
          {availableTools.map(tool => (
            <div 
              key={tool}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
            >
              {getToolIcon(tool)}
              <span>{tool}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Example Messages */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Examples</h3>
        <div className="grid grid-cols-2 gap-2">
          {exampleMessages.map((example, index) => (
            <button
              key={index}
              onClick={() => handleSendMessage(example.text)}
              disabled={isProcessing}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                {example.icon}
                <span className="text-sm font-medium text-slate-700">{example.text}</span>
              </div>
              <p className="text-xs text-slate-500">{example.description}</p>
              <div className="flex gap-1 mt-2">
                {example.expected_tools.map(tool => (
                  <span key={tool} className="px-1 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                    {tool}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3/4 p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                <p className="text-sm">{message.content}</p>
                
                {/* Show tool execution details for assistant messages */}
                {message.role === 'assistant' && message.metadata && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    {message.metadata.error ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-xs">Execution failed</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">Run ID: {message.metadata.run_id}</span>
                        </div>
                        
                        {message.metadata.tools_used?.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-slate-600">Tools used:</span>
                            <div className="flex gap-1 mt-1">
                              {message.metadata.tools_used.map(tool => (
                                <div key={tool} className="flex items-center gap-1 px-2 py-1 bg-white rounded text-xs">
                                  {getToolIcon(tool)}
                                  <span>{tool}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.metadata.context?.variables && Object.keys(message.metadata.context.variables).length > 0 && (
                          <div>
                            <span className="text-xs text-slate-600">Context variables:</span>
                            <div className="mt-1 space-y-1">
                              {Object.entries(message.metadata.context.variables).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-mono text-blue-600">{key}:</span>
                                  <span className="ml-2 text-slate-700">
                                    {typeof value === 'string' ? value.substring(0, 50) + '...' : JSON.stringify(value).substring(0, 50) + '...'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-slate-100 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing with AI tools...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe what you want to do with documents, images, or CAD files..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrchestratorDemo;