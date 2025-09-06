import { 
  Package, BarChart2, FileText, Layers, Building, Bot, Brain, QrCode, Upload, MessageCircle, Zap, Users, Network, Smartphone, FolderKanban, Truck, Wallet, Mic, BookOpen, Headphones, Calendar, Sparkles, Settings, Server, SortAsc
} from 'lucide-react';

export const navItems = [
  { key: "document-sorter", label: "Document Sorter", icon: SortAsc },
  { key: "invoice2", label: "Invoice Processor 2", icon: FileText },
  { key: "invoice-simple", label: "Invoice Simple", icon: FileText },
  // { key: "invoice", label: "Invoice Processing", icon: FileText },
  // { key: "proccessor", label: "Procesor dokumenata", icon: Layers },
  { key: "floorplan", label: "Tlocrt", icon: Building },
  // { key: "warehouse", label: "Skladište", icon: Package },
  // { key: "BoQ", label: "Troškovnik", icon: BarChart2},
  { key: "asistent", label: "Asistent", icon: Bot },
  // { key: "ai-inference", label: "AI Inference", icon: Brain },
  // { key: "barcode-scanner", label: "Barcode Scanner", icon: QrCode },
  // { key: "ai-file-processor", label: "AI File Processor", icon: Upload },
  { key: "chat", label: "Chat", icon: MessageCircle, badge: { color: 'emerald', count: 3, pulse: true } },
  { key: "circus", label: "Glasovno projektiranje", icon: Zap },
  // { key: "users", label: "Upravljanje korisnicima", icon: Users},
  { key: "employogram", label: "Employogram", icon: Network},
  // { key: "employogram-original", label: "Employogram Original", icon: Network},
  // { key: "employogram2", label: "Employogram2", icon: Network},
  { key: "agbim-field", label: "AGBIM Field Simulator", icon: Smartphone},
  // { key: "task-hub", label: "Task Hub", icon: FolderKanban},
  { key: "dispatch", label: "Otprema", icon: Truck, badge: { color: 'amber' }},
  { key: "accounting", label: "Accounting", icon: Wallet},
  { key: "voice", label: "Glasovni Agent", icon: Mic},
  { key: "ai-agent-guide", label: "AI Agent Guide", icon: BookOpen},
  { key: "voice-agent-hr", label: "Hrvatski Glasovni Agent", icon: Headphones},
  { key: "voice-hr-v2", label: "Voice HR V2", icon: Mic},
  { key: "gantt-agent", label: "Gantt Voice Agent", icon: Calendar},
  { key: "voice-orchestrator", label: "Voice Orchestrator", icon: Zap},
  // { key: "animations", label: "Animation Playground", icon: Sparkles},
  { key: "animations-v2", label: "Animation Playground V2", icon: Sparkles}
  ,{ key: "background-lab", label: "Appearance", icon: Layers }
  // ,{ key: "fluent", label: "Fluent Hover Peek", icon: Sparkles }
  // ,{ key: "hover", label: "Fs Hover Preview", icon: Sparkles }
  // ,{ key: "gantt", label: "Gantt Chart", icon: Calendar }
  // ,{ key: "materials", label: "Materials Grid", icon: Package }
  // ,{ key: "ProjectView", label: "Project View", icon: FolderKanban }
  // ,{ key: "reports", label: "Reports", icon: BarChart2 }
  // ,{ key: "showcase", label: "Showcase Panel", icon: Sparkles }
  // ,{ key: "timeline", label: "Timeline Visualization", icon: Calendar }
  ,{ key: "gva-v2", label: "G VAv2", icon: Calendar }
  ,{ key: "codex-control", label: "Codex Control", icon: Settings }
  ,{ key: "llm-server", label: "LLM Server Manager", icon: Server }
];
