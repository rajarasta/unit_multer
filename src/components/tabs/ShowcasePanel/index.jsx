import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
Home, Library, Gamepad2, AppWindow, Search, Settings, Sparkles, 
  MoreHorizontal, ChevronDown, ChevronLeft, Bell, Check, CheckCheck, Plus, Minus, FileText,
  GitBranch, Clock, Download, Upload, Eye, Edit3, Trash2, Copy,
  Lock, Unlock, Users, FolderOpen, AlertCircle, Circle, Triangle, Shuffle, 
  ChevronRight, ArrowRight, ArrowUp, Loader, Truck, FileSpreadsheet,
  CheckCircle, XCircle, RefreshCw, Save, History, Package, Heart, Hexagon, Move,EyeOff,
  Calendar, Flag, Target, Zap, TrendingUp, Award, Star, MessageSquare, Image as ImageIcon, Phone,
  AlertTriangle, BarChart3, Layers, Grid3x3, Play, Pause, FastForward, Mail, ClipboardList, Building2,
  Rewind, Maximize2, Filter, Camera,ShoppingCart,QrCode, Share2, BadgeCheck, Bookmark,
  Building, MapPin, DoorOpen, Square, Maximize, Activity, X, ExternalLink // Also add X here
} from "lucide-react";

const cx = (...xs) => xs.filter(Boolean).join(" ");

const FsTag = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] leading-5 text-white/80">
    <Sparkles className="h-3 w-3" /> {children}
  </span>
);

const FsPill = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[12px] text-white/90 ring-1 ring-white/10 backdrop-blur">
    {children}
  </span>
);

const FsButton = ({ children, variant = "primary", icon: Icon, ...props }) => {
  const base = "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition";
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : "bg-white/10 text-white hover:bg-white/20";
  return (
    <button className={cx(base, styles)} {...props}>
      {Icon && <Icon className="h-4 w-4" />} {children}
    </button>
  );
};

const fileIconFor = (type) => {
  if (["png", "jpg", "jpeg", "webp"].includes(type)) return ImageIcon;
  if (["xls", "xlsx", "csv"].includes(type)) return FileSpreadsheet;
  return FileText;
};

// ---------- mock data (ALUMINUM industry) ----------
const MOCK_ITEMS = [
  {
    id: "al1",
    title: "6061-T6 Structural Extrusions",
    vendor: "AeroMetals Inc.",
    rating: 4.8,
    orders: "1.2K",
    hero: "https://images.unsplash.com/photo-1604335399105-a0d7ad5c88c7?q=80&w=1800&auto=format&fit=crop", // aluminum bars
    tags: ["Extrusion", "6061-T6", "Mill Finish", "RoHS"],
    verified: true, // ISO 9001
    blurb:
      "High-strength, heat-treatable aluminum extrusions in common aerospace profiles. Tight tolerance cuts, mill certs included. Suitable for structural frames, fixtures, and enclosures.",
    features: ["Â±0.10 mm tolerance", "Mill certificates", "REACH compliant", "Heat treatable"],
    attachments: [
      { name: "6061-T6_Profile_Catalog.pdf", type: "pdf", size: "2.3 MB" },
      { name: "A47_TSlot_Detail.dwg.png", type: "png", size: "640 KB" },
      { name: "Mechanical_Properties_6061.xlsx", type: "xlsx", size: "96 KB" },
    ],
    drawings: [
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1531831108325-7fe9616bc231?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "al2",
    title: "Anodized Coil Stock (Architectural)",
    vendor: "UrbanMetal Coatings",
    rating: 4.6,
    orders: "870",
    hero: "https://images.unsplash.com/photo-1581092588429-8e09d6a19b24?q=80&w=1800&auto=format&fit=crop",
    tags: ["Coil", "Anodized", "AA10", "UV Stable"],
    verified: true,
    blurb:
      "Pre-anodized aluminum coil in architectural finishes (clear, bronze, black). Consistent color across lots, UV-stable oxide layer, ready for facade cladding and trims.",
    features: ["AA10 coating", "Salt-spray tested", "Color lot traceability", "Non-fingerprint"],
    attachments: [
      { name: "Finish_Swatch_Bronze.pdf", type: "pdf", size: "1.1 MB" },
      { name: "Coil_Dimensions_Sheet.xlsx", type: "xlsx", size: "52 KB" },
    ],
    drawings: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495562569060-2eec283d3391?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "al3",
    title: "High-Pressure Die Casting (HPDC)",
    vendor: "SynCast Foundry",
    rating: 4.7,
    orders: "2.8K",
    hero: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1800&auto=format&fit=crop",
    tags: ["Casting", "ADC12", "Thin-wall"],
    verified: true,
    blurb:
      "HPDC parts in ADC12 and A380 with thin-wall capability down to 1.2 mm. Tooling DFM, vacuum assist, and post-machining available.",
    features: ["CT capability", "Vacuum gating", "PPAP ready", "Shot monitoring"],
    attachments: [
      { name: "DFM_Checklist_HPDC.pdf", type: "pdf", size: "690 KB" },
      { name: "ADC12_Material_Card.pdf", type: "pdf", size: "420 KB" },
      { name: "PPAP_Template.xlsx", type: "xlsx", size: "88 KB" },
    ],
    drawings: [
      "https://images.unsplash.com/photo-1581093588401-16ec8f20c8f0?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1548095115-45697e51374e?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "al4",
    title: "Recycled Aluminum Billets (75% PCR)",
    vendor: "EcoAlloy Mill",
    rating: 4.5,
    orders: "640",
    hero: "https://images.unsplash.com/photo-1581094651181-3592a47057a4?q=80&w=1800&auto=format&fit=crop",
    tags: ["Billets", "Sustainability", "PCR 75%"],
    verified: false,
    blurb:
      "Billets with 75% post-consumer recycled content for low-carbon extrusion programs. EPD available, consistent chemistry, excellent surface quality.",
    features: ["EPD provided", "COâ‚‚e tracked", "Chemistry control", "Traceability"],
    attachments: [{ name: "EPD_EcoAlloy.pdf", type: "pdf", size: "1.9 MB" }],
    drawings: [
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1200&auto=format&fit=crop",
    ],
  },
];

// ---------- GRID tile (unchanged look, but industry terms) ----------
function FsTileCard({ item, expanded, onHover, onLeave }) {
  return (
    <motion.div
      layout
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      transition={{ layout: { duration: 0.35, ease: [0.2, 0, 0, 1] } }}
      className={cx(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.65)]",
        expanded ? "col-span-2 row-span-2" : "col-span-1 row-span-1"
      )}
    >
      <img
        src={item.hero}
        alt=""
        className={cx(
          "absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300",
          "group-hover:scale-[1.04]"
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80" />

      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <div className="mb-auto flex items-center gap-2">
          <FsPill>
            <Building2 className="h-3.5 w-3.5" /> {item.vendor}
          </FsPill>
          {item.verified && (
            <FsPill>
              <BadgeCheck className="h-3.5 w-3.5" /> ISO 9001
            </FsPill>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
          <span className="inline-flex items-center gap-1 text-white/80 text-sm">
            <Star className="h-4 w-4 fill-current" /> {item.rating}
          </span>
          <span className="text-white/60 text-sm">â€¢ {item.orders} orders</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <FsTag key={t}>{t}</FsTag>
          ))}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-3"
            >
              <div className="max-h-24 overflow-y-auto pr-1 text-[13px] leading-5 text-white/85">
                {item.blurb}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <FsButton icon={Download}>Download spec</FsButton>
                <FsButton icon={Heart} variant="secondary">
                  Watchlist
                </FsButton>
                <FsButton icon={Share2} variant="secondary">
                  Share
                </FsButton>
              </div>

              <div className="mt-3">
                <div className="text-xs uppercase tracking-wide text-white/60 mb-1">
                  Highlights
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-white/85">
                  {item.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------- LIST row (much richer expansion) ----------
function FsRowCard({ item, expanded, onHover, onLeave }) {
  return (
    <motion.div
      layout
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      transition={{ layout: { duration: 0.38, ease: [0.2, 0, 0, 1] } }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
    >
      {/* header row */}
      <div className="grid grid-cols-[220px,1fr] gap-0">
        <div className="relative h-44">
          <img src={item.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="relative p-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <span className="inline-flex items-center gap-1 text-white/80 text-sm">
              <Star className="h-4 w-4 fill-current" /> {item.rating}
            </span>
            <span className="text-white/60 text-sm">â€¢ {item.orders} orders</span>
            {item.verified && (
              <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-emerald-300/90">
                <BadgeCheck className="h-4 w-4" /> ISO 9001
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <FsTag key={t}>{t}</FsTag>
            ))}
          </div>
        </div>
      </div>

      {/* expansion */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded-row"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-4 pb-4"
          >
            <div className="mt-3 grid gap-4 xl:grid-cols-3">
              {/* left: long copy + attachments + actions */}
              <div className="xl:col-span-2">
                <div className="max-h-72 overflow-y-auto pr-2 text-[13px] leading-6 text-white/85">
                  <p className="mb-3">{item.blurb}</p>
                  <p className="mb-3">
                    Typical lead time 10â€“15 business days for standard profiles. Custom tooling
                    supported; submit STEP or DWG for a DFM pass. Meets RoHS and REACH; mill
                    certificates available per lot. Recommended finishing: clear anodize or powder coat.
                  </p>
                  <div className="text-xs uppercase tracking-wide text-white/60 mb-2">
                    Attachments
                  </div>
                  <ul className="space-y-1.5">
                    {item.attachments?.map((a) => {
                      const Icon = fileIconFor(a.type);
                      return (
                        <li
                          key={a.name}
                          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-white/90 ring-1 ring-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{a.name}</span>
                            <span className="text-xs text-white/50">â€¢ {a.size}</span>
                          </div>
                          <button className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
                            <Download className="h-4 w-4" /> Download
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 text-xs uppercase tracking-wide text-white/60 mb-1">
                    Highlights
                  </div>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-white/85">
                    {item.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> {f}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <FsButton icon={MessageSquare}>Request quote</FsButton>
                    <FsButton icon={Mail} variant="secondary">
                      Contact sales
                    </FsButton>
                    <FsButton icon={Phone} variant="secondary">
                      Call mill
                    </FsButton>
                    <FsButton icon={Share2} variant="secondary">
                      Share
                    </FsButton>
                  </div>
                </div>
              </div>

              {/* right: drawings / images */}
              <div className="xl:col-span-1">
                <div className="text-xs uppercase tracking-wide text-white/60 mb-2">
                  Technical drawings & photos
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(item.drawings || []).map((src, i) => (
                    <div
                      key={src + i}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- main panel ----------
export default function GamesShowcasePanel({
  visible = true,
  view = "grid", // "grid" | "list"
  items = MOCK_ITEMS,
}) {
  const [hovered, setHovered] = useState(null);

  // small delay helps prevent jitter when moving across child elements
  const clearHover = () => {
    window.clearTimeout(GamesShowcasePanel._tid);
    GamesShowcasePanel._tid = window.setTimeout(() => setHovered(null), 40);
  };
  const setHover = (id) => {
    window.clearTimeout(GamesShowcasePanel._tid);
    setHovered(id);
  };

  const grid = view === "grid";

  return (
    <div className={cx(visible ? "block" : "hidden", "w-full overflow-x-hidden")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Catalog</h2>
        <div className="text-sm text-white/70 flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Store-style hover expansion (aluminum)
        </div>
      </div>

      <LayoutGroup>
        {grid ? (
          <div
            className={cx(
              "grid gap-4",
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              "auto-rows-[12rem]"
            )}
          >
            {items.map((item) => (
              <FsTileCard
                key={item.id}
                item={item}
                expanded={hovered === item.id}
                onHover={() => setHover(item.id)}
                onLeave={clearHover}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <FsRowCard
                key={item.id}
                item={item}
                expanded={hovered === item.id}
                onHover={() => setHover(item.id)}
                onLeave={clearHover}
              />
            ))}
          </div>
        )}
      </LayoutGroup>
    </div>
  );
}


