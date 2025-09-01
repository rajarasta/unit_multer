/* 
 * CHANGE: 2025-09-01 - Added Brain and QrCode icon imports for new tabs
 * WHY: Supporting AI Inference and Barcode Scanner functionality in navigation
 * IMPACT: Enables new tab icons display in sidebar navigation
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #navigation #icons #ai-inference #barcode-scanner #lucide-react
 */
import { 
Home, Package, BarChart3, GitBranch, FileText, BarChart2,
  Layers, Building, Sparkles, Settings, Eye, Grid3x3, Briefcase, Bot, Zap, Users, Network, Brain, QrCode, Upload
} from 'lucide-react';

export const navItems = [
 // { key: "timeline", label: "Timeline", icon: GitBranch },
  { key: "invoice", label: "Invoice Processing", icon: FileText },
  { key: "proccessor", label: "Procesor dokumenata", icon: Layers },
  { key: "floorplan", label: "Tlocrt", icon: Building },
  // { key: "napredni", label: "napredni", icon: Building },
  // { key: "napredni2", label: "napredni", icon: Building },
  //{ key: "animations", label: "Animations", icon: Sparkles },
  //{ key: "reports", label: "Reports", icon: BarChart3 },
  //{ key: "warehouse", label: "SkladiÅ¡te", icon: Package },
  //{ key: "showcase", label: "Showcase", icon: Grid3x3 },
  //{ key: "fluent", label: "Fluent", icon: FileText },
  //{ key: "hover", label: "Hover", icon: Eye },
  //{ key: "BoQ", label: "TroÅ¡kovnikm", icon: BarChart2},
  //{ key: "ProjectView", label: "ProjectView", icon: Briefcase},
  { key: "asistent", label: "Asistent", icon: Bot },
  /* 
   * CHANGE: 2025-09-01 - Added AI Inference navigation item
   * WHY: User requested new AI Inference tab for aluminum store management
   * IMPACT: Creates new navigation option in sidebar with Brain icon
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #ai-inference #navigation-item #brain-icon
   */
  { key: "ai-inference", label: "AI Inference", icon: Brain },
  /* 
   * CHANGE: 2025-09-01 - Added Barcode Scanner navigation item
   * WHY: User requested barcode and QR code scanning functionality for inventory management
   * IMPACT: Creates new navigation option in sidebar with QrCode icon
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #barcode-scanner #qr-code #navigation-item #inventory
   */
  { key: "barcode-scanner", label: "Barcode Scanner", icon: QrCode },
  /* 
   * CHANGE: 2025-09-01 - Added AI File Processor navigation item
   * WHY: Enable file upload and processing with OpenWebUI and LM Studio
   * IMPACT: Creates new navigation option in sidebar with Upload icon
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #ai-file-processor #file-upload #openwebui #lm-studio #navigation-item
   */
  { key: "ai-file-processor", label: "AI File Processor", icon: Upload },
  { key: "circus", label: "Circus", icon: Zap },
  { key: "gantt", label: "Interaktivni gannt", icon: Briefcase},
  { key: "users", label: "Upravljanje korisnicima", icon: Users},
  { key: "employogram", label: "Employogram", icon: Network}
 
];

