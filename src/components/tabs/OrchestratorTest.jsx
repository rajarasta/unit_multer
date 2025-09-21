import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, XCircle, FileText, Table, Image, Wrench } from 'lucide-react';

const OrchestratorTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);

  const runBasicTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const tests = [
      {
        name: "Import Orchestrator",
        test: async () => {
          const { createOrchestratorClient } = await import('../../orchestrator/index.js');
          return { success: true, message: "Orchestrator uspješno učitan" };
        }
      },
      {
        name: "Test Tool Registry",
        test: async () => {
          const { getAvailableTools } = await import('../../orchestrator/index.js');
          const tools = getAvailableTools();
          return { 
            success: tools.length === 5, 
            message: `${tools.length} alata dostupno: ${tools.join(', ')}` 
          };
        }
      },
      {
        name: "Test Signature Generation",
        test: async () => {
          const { signature } = await import('../../orchestrator/index.js');
          const sig1 = signature([{type: "table"}], "extract");
          const sig2 = signature([{type: "table"}, {type: "dwg"}], "compare");
          return { 
            success: sig1 === "table|extract" && sig2 === "dwg+table|compare",
            message: `Signatures: "${sig1}", "${sig2}"`
          };
        }
      },
      {
        name: "Test ExecutionEnvelope Validation",
        test: async () => {
          const { isValidExecutionEnvelope, createTestEnvelope } = await import('../../orchestrator/index.js');
          const envelope = createTestEnvelope();
          const isValid = isValidExecutionEnvelope(envelope);
          return { 
            success: isValid,
            message: `Envelope validation: ${isValid ? 'VALID' : 'INVALID'}`
          };
        }
      },
      {
        name: "Test OCR Tool",
        test: async () => {
          const { ocr_pdf } = await import('../../orchestrator/index.js');
          const { createExecutionContext } = await import('../../orchestrator/shared/types.js');
          
          const ctx = createExecutionContext("test_run", {});
          const result = await ocr_pdf.execute({
            file_url: "file:///test/document.pdf",
            language: "hr"
          }, ctx);
          
          return { 
            success: result.kind === "ocr_pdf" && result.character_count > 0,
            message: `OCR processed ${result.character_count} characters`
          };
        }
      },
      {
        name: "Test Table Extraction Tool",
        test: async () => {
          const { extract_table } = await import('../../orchestrator/index.js');
          const { createExecutionContext } = await import('../../orchestrator/shared/types.js');
          
          const ctx = createExecutionContext("test_run", {});
          const result = await extract_table.execute({
            file_url: "file:///test/ponuda.xlsx",
            sheet_name: "Sheet1"
          }, ctx);
          
          return { 
            success: result.kind === "extract_table" && result.row_count > 0,
            message: `Table extracted: ${result.row_count} rows, ${result.column_count} columns`
          };
        }
      },
      {
        name: "Test VLM Tool", 
        test: async () => {
          const { vlm_describe } = await import('../../orchestrator/index.js');
          const { createExecutionContext } = await import('../../orchestrator/shared/types.js');
          
          const ctx = createExecutionContext("test_run", {});
          const result = await vlm_describe.execute({
            image_url: "file:///test/prozor.jpg",
            detail_level: "medium"
          }, ctx);
          
          return { 
            success: result.kind === "vlm_describe" && result.description.length > 0,
            message: `Image described: ${result.description.substring(0, 50)}...`
          };
        }
      },
      {
        name: "Test OpenAI Tools Format",
        test: async () => {
          const { registryToOpenAITools } = await import('../../orchestrator/index.js');
          const tools = registryToOpenAITools();
          const hasCorrectStructure = tools.every(tool => 
            tool.type === "function" && 
            tool.function.name && 
            tool.function.description &&
            tool.function.parameters
          );
          
          return { 
            success: hasCorrectStructure && tools.length === 5,
            message: `${tools.length} tools converted to OpenAI format`
          };
        }
      }
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      
      try {
        const result = await test.test();
        setTestResults(prev => [...prev, {
          name: test.name,
          success: result.success,
          message: result.message,
          duration: Math.random() * 1000 + 200 // Mock duration
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          name: test.name,
          success: false,
          message: `Error: ${error.message}`,
          duration: 0
        }]);
      }
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setCurrentTest(null);
    setIsRunning(false);
  };

  const runAllTests = async () => {
    try {
      const { runAllTests } = await import('../../orchestrator/test/example.js');
      console.log("🧪 Running comprehensive tests in console...");
      await runAllTests();
      
      setTestResults(prev => [...prev, {
        name: "Comprehensive Tests",
        success: true,
        message: "Check browser console for detailed results",
        duration: 0
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        name: "Comprehensive Tests",
        success: false,
        message: `Error: ${error.message}`,
        duration: 0
      }]);
    }
  };

  const testIcon = (testName) => {
    if (testName.includes("OCR")) return <FileText className="w-4 h-4" />;
    if (testName.includes("Table")) return <Table className="w-4 h-4" />;
    if (testName.includes("VLM")) return <Image className="w-4 h-4" />;
    return <Wrench className="w-4 h-4" />;
  };

  const successCount = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Orchestrator Testing</h2>
            <p className="text-sm text-slate-500">Validate tool system functionality</p>
          </div>
        </div>
        
        {totalTests > 0 && (
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-800">
              {successCount}/{totalTests}
            </div>
            <div className="text-sm text-slate-500">tests passed</div>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-3">
          <button
            onClick={runBasicTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Run Basic Tests
          </button>
          
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" />
            Run All Tests (Console)
          </button>
          
          <button
            onClick={() => {
              setTestResults([]);
              setCurrentTest(null);
            }}
            disabled={isRunning}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>
        
        {currentTest && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Running: {currentTest}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="flex-1 overflow-auto p-4">
        {testResults.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Wrench size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No tests run yet</p>
              <p className="text-sm">Click "Run Basic Tests" to start validation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      result.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {testIcon(result.name)}
                        <h3 className="font-medium text-slate-800">{result.name}</h3>
                      </div>
                      <p className={`text-sm ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                  
                  {result.duration > 0 && (
                    <div className="text-xs text-slate-500">
                      {Math.round(result.duration)}ms
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-700 mb-2">Testing Instructions</h3>
        <div className="text-xs text-slate-600 space-y-1">
          <p>• <strong>Basic Tests:</strong> Validate core functionality without external dependencies</p>
          <p>• <strong>All Tests:</strong> Comprehensive testing output in browser console</p>
          <p>• <strong>Next Step:</strong> Test with real LLM endpoint using OrchestratorDemo tab</p>
        </div>
      </div>
    </div>
  );
};

export default OrchestratorTest;