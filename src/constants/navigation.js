import { 
  Package, BarChart2, FileText, Layers, Building, Bot, Brain, QrCode, Upload, MessageCircle, Zap, Users, Network, Smartphone, FolderKanban, Truck, Wallet, Mic, BookOpen, Headphones
} from 'lucide-react';

export const navItems = [
  { key: "invoice2", label: "Invoice Processor 2", icon: FileText },
  { key: "invoice-simple", label: "Invoice Simple", icon: FileText },
  { key: "proccessor", label: "Procesor dokumenata", icon: Layers },
  { key: "floorplan", label: "Tlocrt", icon: Building },
  { key: "warehouse", label: "Skladište", icon: Package },
  { key: "BoQ", label: "Troškovnik", icon: BarChart2},
  { key: "asistent", label: "Asistent", icon: Bot },
  { key: "ai-inference", label: "AI Inference", icon: Brain },
  { key: "barcode-scanner", label: "Barcode Scanner", icon: QrCode },
  { key: "ai-file-processor", label: "AI File Processor", icon: Upload },
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "circus", label: "Glasovno projektiranje", icon: Zap },
  { key: "users", label: "Upravljanje korisnicima", icon: Users},
  { key: "employogram", label: "Employogram", icon: Network},
  { key: "agbim-field", label: "AGBIM Field Simulator", icon: Smartphone},
  { key: "task-hub", label: "Task Hub", icon: FolderKanban},
  { key: "dispatch", label: "Otprema", icon: Truck},
  { key: "accounting", label: "Accounting", icon: Wallet},
  { key: "voice", label: "Glasovni Agent", icon: Mic},
  { key: "ai-agent-guide", label: "AI Agent Guide", icon: BookOpen},
  { key: "voice-agent-hr", label: "Hrvatski Glasovni Agent", icon: Headphones},
  { key: "voice-hr-v2", label: "Voice HR V2", icon: Mic}
];