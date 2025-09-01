/* 
 * CHANGE: 2025-09-01 - Created new Barcode & QR Code Scanner tab component
 * WHY: User requested new tab for barcode and QR code scanning functionality
 * IMPACT: Adds scanning capabilities to aluminum store management system for inventory tracking
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #barcode-scanner #qr-code #inventory #scanning #react-component
 */

/* 
 * CHUNK: Barcode & QR Code Scanner Main Component
 * PURPOSE: Provides barcode and QR code scanning capabilities for aluminum inventory management
 * DEPENDENCIES: React hooks, Lucide React icons, Web APIs (camera access)
 * OUTPUTS: Complete scanning interface with camera preview, scan history, and product lookup
 * COMPLEXITY: Medium - camera integration, scan processing, inventory lookup features
 * REFACTOR_CANDIDATE: Yes - extract camera logic to custom hook when real scanning implemented
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  Scan, 
  Camera, 
  Upload, 
  Download, 
  History, 
  Package,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Play,
  Square
} from 'lucide-react';

/* 
 * TODO_REFACTOR: Extract camera management to separate hook
 * EXTRACTION_TARGET: src/hooks/useCamera.js
 * JUSTIFICATION: Camera logic will become complex, reusable across components
 * EXTRACTION_INTERFACE: { isActive, startCamera, stopCamera, captureFrame, stream }
 * DEPENDENCIES_TO_MOVE: [camera stream management, device selection, frame capture]
 * ESTIMATED_EFFORT: Medium (2-3 hours when camera logic implemented)
 * PRIORITY: High - camera logic is complex and should be isolated
 */

/* 
 * TODO_REFACTOR: Extract barcode processing to separate service
 * EXTRACTION_TARGET: src/services/barcodeService.js
 * JUSTIFICATION: Barcode decoding, format detection, validation logic
 * EXTRACTION_INTERFACE: { decodeBarcode, validateCode, lookupProduct, formatResult }
 * DEPENDENCIES_TO_MOVE: [barcode libraries, format parsers, validation rules]
 * ESTIMATED_EFFORT: Medium (3-4 hours when scanning logic implemented)
 * PRIORITY: Medium - plan for when real scanning library is integrated
 */

const BarcodeScanner = () => {
  /* 
   * ===== SECTION: Component State Management =====
   * LINES: 52 - 70
   * PURPOSE: Manages local component state for scanning operations and UI
   * SEARCH_KEYWORDS: #section-state #scanner-state #camera-state
   * COMPLEXITY: Medium - multiple related state pieces
   * DEPENDENCIES: React useState hook
   * ===== END SECTION =====
   */
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCodes, setScannedCodes] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('environment');
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState('barcode'); // 'barcode' or 'qr'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  /* 
   * PERFORMANCE_NOTE: Multiple useState could be consolidated into useReducer for better performance
   * MEMORY_MANAGEMENT: Video stream cleanup handled in useEffect cleanup
   * OPTIMIZATION_POTENTIAL: Add debouncing for continuous scanning when real camera implemented
   */

  /* 
   * ===== SECTION: Camera Management Effects =====
   * LINES: 75 - 95
   * PURPOSE: Handles camera lifecycle and cleanup
   * SEARCH_KEYWORDS: #section-camera #useeffect #cleanup
   * COMPLEXITY: Medium - camera stream management
   * DEPENDENCIES: Browser MediaDevices API, component state
   * ===== END SECTION =====
   */
  useEffect(() => {
    /* 
     * BUG_PREVENTION: Cleanup video stream on component unmount to prevent memory leaks
     * KNOWN_ISSUES: None - placeholder implementation
     * TESTING_CHECKLIST: [Test camera permissions, test device switching, test cleanup on unmount]
     */
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  /* 
   * ===== SECTION: Scanning Event Handlers =====
   * LINES: 100 - 180
   * PURPOSE: Handles user interactions for scanning operations
   * SEARCH_KEYWORDS: #section-handlers #scanning #camera-control
   * COMPLEXITY: Medium - camera API integration placeholder
   * DEPENDENCIES: Component state setters, browser APIs
   * ===== END SECTION =====
   */
  const startScanning = async () => {
    /* 
     * INTEGRATION_POINT: Browser MediaDevices API for camera access
     * EXTERNAL_DEPENDENCIES: getUserMedia, camera permissions
     * STATE_CONTRACT: Updates isScanning state and manages video stream
     */
    try {
      setIsScanning(true);
      
      // TODO: Replace with actual camera initialization
      // const stream = await navigator.mediaDevices.getUserMedia({
      //   video: { facingMode: selectedCamera }
      // });
      // if (videoRef.current) {
      //   videoRef.current.srcObject = stream;
      // }
      
      // Simulate camera start
      console.log(`Starting ${scanMode} scanner with ${selectedCamera} camera`);
      
    } catch (error) {
      console.error('Camera access denied:', error);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const simulateScan = () => {
    /* 
     * BUG_PREVENTION: Processing state prevents multiple simultaneous scans
     * KNOWN_ISSUES: None - mock implementation
     * DEBUG_STRATEGY: Console logging for scan simulation tracking
     * TESTING_CHECKLIST: [Test scan processing, test result display, test history update]
     */
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    // Simulate barcode/QR code detection
    const mockCodes = {
      barcode: [
        '1234567890123',
        '9876543210987',
        '5555555555555',
        '1111111111111'
      ],
      qr: [
        'https://example.com/product/ABC123',
        '{"product_id":"ALU001","type":"aluminum_profile","length":"6m"}',
        'INVENTORY:ALU-ANGLE-001:QTY:50:LOC:A1-B3',
        'ORDER:ORD-2025-001:CUSTOMER:ABC-Corp'
      ]
    };
    
    setTimeout(() => {
      const codes = mockCodes[scanMode];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];
      
      const newScan = {
        id: Date.now(),
        code: randomCode,
        type: scanMode,
        timestamp: new Date().toISOString(),
        format: scanMode === 'barcode' ? 'EAN-13' : 'QR Code',
        status: 'success',
        productInfo: scanMode === 'barcode' ? 
          { name: 'Aluminum Profile', sku: randomCode, stock: Math.floor(Math.random() * 100) } :
          { data: randomCode, decoded: true }
      };
      
      setScannedCodes(prev => [newScan, ...prev.slice(0, 19)]); // Keep last 20 scans
      setScanResult(newScan);
      setIsProcessing(false);
      
      // Auto-clear result after 3 seconds
      setTimeout(() => setScanResult(null), 3000);
    }, 1500);
  };

  const clearHistory = () => {
    setScannedCodes([]);
    setScanResult(null);
  };

  /* 
   * ===== SECTION: UI Rendering =====
   * LINES: 190 - 400
   * PURPOSE: Renders the complete barcode/QR scanner interface
   * SEARCH_KEYWORDS: #section-ui #scanner-interface #camera-preview #tailwind
   * COMPLEXITY: High - comprehensive scanning interface with multiple panels
   * DEPENDENCIES: Tailwind CSS classes, Lucide icons, component state
   * ===== END SECTION =====
   */
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 
       * INTEGRATION_POINT: Header section with scanning controls and mode selection
       * EXTERNAL_DEPENDENCIES: Lucide React icons
       * PROP_INTERFACE: None - self-contained component
       * STATE_CONTRACT: Uses local component state for scanner configuration
       */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <QrCode className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Barcode & QR Scanner</h1>
              <p className="text-sm text-gray-600">Scan products and inventory items for aluminum store management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Mode:</label>
              <select
                value={scanMode}
                onChange={(e) => setScanMode(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                disabled={isScanning}
              >
                <option value="barcode">Barcode</option>
                <option value="qr">QR Code</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Camera:</label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                disabled={isScanning}
              >
                <option value="environment">Back Camera</option>
                <option value="user">Front Camera</option>
              </select>
            </div>
            <Settings className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Scanner Panel */}
        <div className="w-2/3 p-6 border-r border-gray-200">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Camera className="h-5 w-5 mr-2 text-purple-600" />
                  Scanner Preview
                </h2>
                <div className="flex items-center space-x-2">
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Scanner</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop Scanner</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Camera Preview Area */}
            <div className="flex-1 p-4 flex items-center justify-center bg-gray-900 m-4 rounded-lg relative">
              {isScanning ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-lg"
                    style={{ display: 'none' }} // Hidden until real camera implemented
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0"
                    style={{ display: 'none' }}
                  />
                  
                  {/* Mock Camera View */}
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative">
                    <div className="text-white text-center">
                      <Camera className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                      <p className="text-lg font-medium">Camera Preview</p>
                      <p className="text-sm text-gray-300 mt-1">Position {scanMode} in the frame</p>
                    </div>
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 border-2 border-purple-500 rounded-lg">
                      <div className="absolute inset-4 border border-purple-300 rounded-lg animate-pulse">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <QrCode className="h-24 w-24 mx-auto mb-4" />
                  <p className="text-lg">Camera Inactive</p>
                  <p className="text-sm">Click "Start Scanner" to begin</p>
                </div>
              )}
            </div>

            {/* Scan Controls */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={simulateScan}
                    disabled={!isScanning || isProcessing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4" />
                        <span>Simulate Scan</span>
                      </>
                    )}
                  </button>
                  <button className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Upload Image</span>
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Mode: {scanMode.toUpperCase()} | Camera: {selectedCamera === 'environment' ? 'Back' : 'Front'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results and History Panel */}
        <div className="w-1/3 p-6">
          <div className="space-y-6">
            {/* Current Scan Result */}
            {scanResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Scan Result
                  </h3>
                  <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
                    {scanResult.format}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Code:</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded font-mono break-all">
                      {scanResult.code}
                    </p>
                  </div>
                  {scanResult.productInfo && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Product Info:</p>
                      <div className="text-sm text-gray-900 bg-blue-50 p-2 rounded">
                        {scanResult.type === 'barcode' ? (
                          <div>
                            <p><strong>Name:</strong> {scanResult.productInfo.name}</p>
                            <p><strong>SKU:</strong> {scanResult.productInfo.sku}</p>
                            <p><strong>Stock:</strong> {scanResult.productInfo.stock} units</p>
                          </div>
                        ) : (
                          <p className="font-mono text-xs">{scanResult.productInfo.data}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Scan History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <History className="h-5 w-5 mr-2 text-blue-600" />
                  Scan History ({scannedCodes.length})
                </h3>
                {scannedCodes.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {scannedCodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No scans yet</p>
                      <p className="text-sm">Start scanning to see history</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {scannedCodes.map((scan) => (
                      <div key={scan.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            scan.type === 'barcode' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {scan.format}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(scan.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-gray-800 break-all mb-1">
                          {scan.code.length > 30 ? `${scan.code.substring(0, 30)}...` : scan.code}
                        </p>
                        {scan.productInfo && scan.type === 'barcode' && (
                          <p className="text-xs text-gray-600">
                            {scan.productInfo.name} • Stock: {scan.productInfo.stock}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with actions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 hover:text-purple-600 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export History</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-purple-600 transition-colors">
              <Search className="h-4 w-4" />
              <span>Product Lookup</span>
            </button>
          </div>
          <div className="text-xs text-gray-500">
            {isScanning ? '🟢 Scanner Active' : '🔴 Scanner Inactive'} • {scannedCodes.length} scans stored
          </div>
        </div>
      </div>
    </div>
  );
};

/* 
 * INTEGRATION_POINT: Default export for lazy loading in App.jsx
 * EXTERNAL_DEPENDENCIES: React, Lucide React icons, Browser MediaDevices API
 * VERSION_COMPATIBILITY: React 19, modern browsers with camera support
 */
export default BarcodeScanner;