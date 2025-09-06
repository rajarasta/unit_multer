import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * Circus Tab - Eksperimentalni vizualni konfigurator
 * 
 * Interaktivna ploča s parallax lebdećim ikonama i animiranim gradijentom
 * za pokretanje vizualnog konfiguriranja aluminijskih elemenata
 */

function DesignerModal({ open, onClose }) {
  if (!open) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="max-w-6xl w-full mx-4 rounded-2xl bg-white p-6 shadow-lg max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Interaktivno projektiranje</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="text-center py-12 text-slate-600">
              <div className="text-lg font-medium mb-2">Eksperimentalni vizualni konfigurator</div>
              <div className="text-sm opacity-70 mb-8">Ova funkcionalnost je u razvoju...</div>
              
              {/* Placeholder za buduće funkcionalnosti */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="p-6 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">3D</span>
                  </div>
                  <h3 className="font-medium mb-2">3D Vizualizacija</h3>
                  <p className="text-sm text-slate-600">Interaktivni 3D prikaz aluminijskih profila</p>
                </div>
                
                <div className="p-6 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">AI</span>
                  </div>
                  <h3 className="font-medium mb-2">AI Preporuke</h3>
                  <p className="text-sm text-slate-600">Pametne preporuke za optimalne konfiguracije</p>
                </div>
                
                <div className="p-6 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">AR</span>
                  </div>
                  <h3 className="font-medium mb-2">AR Pregled</h3>
                  <p className="text-sm text-slate-600">Augmented reality pregled u stvarnom prostoru</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// CIRKUS: Launch ploča s parallax lebdećim ikonama i animiranim gradijentom
function CircusLauncher({ onLaunch }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [p, setP] = useState({ x: 0, y: 0 }); // -0.5..0.5

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setP({ x, y });
  };

  const gradient = {
    backgroundImage:
      "linear-gradient(120deg, #ff0080, #ff8c00, #ffd300, #22d3ee, #7c3aed, #ff0080)",
    backgroundSize: "300% 300%",
  };

  const Item = ({ children, depth = 30, x = "50%", y = "50%", delay = 0 }) => (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
      animate={hovered ? { y: ["-50%", "calc(-50% - 4px)", "-50%" ] } : {}}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        style={{
          transform: `translate3d(${p.x * depth}px, ${p.y * depth}px, 0)`,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );

  // Jednostavne stilizirane minijature (SVG + div kombinacije)
  const Glass = ({ w = 56, h = 36 }) => (
    <div className="rounded-sm border border-white/80 bg-white/40 backdrop-blur-[1px] shadow-md" style={{ width: w, height: h }}>
      <div className="w-full h-full grid grid-cols-2">
        <div className="border-r border-white/60" />
        <div />
      </div>
    </div>
  );
  const Door = () => (
    <div className="w-10 h-16 rounded border-2 border-white/90 bg-white/30 shadow-md relative">
      <div className="absolute left-1.5 bottom-7 w-1.5 h-1.5 rounded-full bg-white/90" />
    </div>
  );
  const CurtainWall = () => (
    <div className="w-20 h-14 rounded-sm border-2 border-white/90 bg-white/25 shadow-md grid grid-cols-3 grid-rows-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-white/50" />
      ))}
    </div>
  );
  const Hinge = () => (
    <div className="w-10 h-8 flex items-center">
      <div className="w-1 h-6 bg-white/80" />
      <div className="ml-1 w-7 h-6 rounded-sm border border-white/80 bg-white/20" />
    </div>
  );
  const Handle = () => (
    <div className="w-8 h-2 rounded-full bg-white/90 shadow" />
  );
  const Person = () => (
    <div className="flex flex-col items-center">
      <div className="w-3.5 h-3.5 rounded-full bg-white/90" />
      <div className="w-2 h-6 rounded bg-white/70 mt-0.5" />
    </div>
  );
  const Tree = () => (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-5 bg-white/80" />
      <div className="w-8 h-8 rounded-full bg-white/30 border border-white/70 -mt-3" />
    </div>
  );
  const Sun = () => (
    <div className="w-6 h-6 rounded-full bg-white/90 shadow-inner" />
  );
  const Moon = () => (
    <div className="relative w-6 h-6">
      <div className="absolute inset-0 rounded-full bg-white/80" />
      <div className="absolute -right-1 inset-y-0 w-5 rounded-full" style={{ background: "radial-gradient(circle at left, transparent 60%, rgba(0,0,0,0.15))" }} />
    </div>
  );
  const Txt = () => (
    <div className="px-2 py-1 rounded bg-white/80 text-[10px] font-bold text-slate-700 shadow">TXT</div>
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setP({ x: 0, y: 0 }); }}
      onClick={onLaunch}
      className="relative overflow-hidden rounded-2xl shadow-lg border border-slate-200 cursor-pointer"
      style={{ height: 300 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Animirani gradijent */}
      <motion.div
        className="absolute inset-0"
        style={gradient}
        animate={ hovered ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : { backgroundPosition: "0% 50%" } }
        transition={{ duration: 12, repeat: hovered ? Infinity : 0, ease: "linear" }}
      />

      {/* Lagani overlay za čitljivost */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Naslov */}
      <div className="relative z-10 h-full flex items-center justify-center text-center">
        <div className="px-8">
          <div className="text-white drop-shadow-lg text-2xl sm:text-3xl font-extrabold tracking-wide mb-2">
            Interaktivno projektiranje
          </div>
          <div className="text-white/90 text-sm">Eksperimentalni vizualni konfigurator</div>
          <div className="text-white/80 text-xs mt-2">Kliknite za početak</div>
        </div>
      </div>

      {/* Lebdeći elementi */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Item depth={18} x="15%" y="20%"><Sun/></Item>
        <Item depth={22} x="85%" y="25%" delay={0.2}><Moon/></Item>
        <Item depth={30} x="25%" y="65%"><Glass/></Item>
        <Item depth={34} x="40%" y="35%" delay={0.4}><Door/></Item>
        <Item depth={26} x="70%" y="60%" delay={0.1}><CurtainWall/></Item>
        <Item depth={40} x="60%" y="35%"><Hinge/></Item>
        <Item depth={45} x="78%" y="72%"><Handle/></Item>
        <Item depth={28} x="15%" y="75%"><Person/></Item>
        <Item depth={24} x="10%" y="45%"><Tree/></Item>
        <Item depth={36} x="55%" y="78%"><Txt/></Item>
      </div>
    </motion.div>
  );
}

// Main Circus Tab Component
export default function Circus() {
  const [designerOpen, setDesignerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Circus
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Eksperimentalna zona za vizualno projektiranje i konfiguraciju aluminijskih sustava
          </p>
        </div>

        {/* Main Circus Launcher */}
        <div className="max-w-2xl mx-auto">
          <CircusLauncher onLaunch={() => setDesignerOpen(true)} />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">3D</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Vizualna Konfiguracija</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Interaktivni 3D prikaz aluminijskih profila s mogućnošću real-time konfiguracije
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Pametne Preporuke</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              AI asistent predlaže optimalne konfiguracije na temelju projekta i specifikacija
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 shadow-sm md:col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">AR</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Augmented Reality</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Pregled konfiguracija u stvarnom prostoru kroz AR tehnologiju
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <div className="text-amber-600 font-medium text-sm mb-1">🚧 Status Razvoja</div>
            <div className="text-slate-700 text-sm">
              Circus modul je trenutno u eksperimentalnoj fazi razvoja. 
              Funkcionalnosti se postupno dodaju i testiraju.
            </div>
          </div>
        </div>

        {/* Designer Modal */}
        <DesignerModal open={designerOpen} onClose={() => setDesignerOpen(false)} />
      </div>
    </div>
  );
}