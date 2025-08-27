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


export default function FluentHoverPeekTab({ items, onOpen }) {
  const [active, setActive] = useState(null);

  const data = useMemo(() => {
    if (items?.length) return items;
    return [
      {
        id: "6061",
        title: "AA 6061-T6 Plate",
        subtitle: "General purpose structural aluminum",
        rating: 4.7,
        price: "From â‚¬3.29/kg",
        tags: ["Extrusion", "Plate", "Weldable"],
        cover: "/assets/aluminum/plate-6061.jpg",
        short:
          "Lightweight structural plate, great strength-to-weight and excellent machinability.",
        long:
          "AA 6061-T6 is a precipitation-hardened aluminum alloy with magnesium and silicon. Excellent weldability; used for frames, fixtures, marine and aerospace.",
        files: [
          { name: "6061-T6_Cert_Mill.pdf", size: "482 KB", type: "PDF" },
          { name: "6061_Tempers_Table.xlsx", size: "35 KB", type: "XLSX" },
          { name: "Machining_Notes.txt", size: "3 KB", type: "TXT" },
        ],
        images: [
          "/assets/aluminum/mill-finish.jpg",
          "/assets/aluminum/anodized.jpg",
          "/assets/aluminum/cnc.jpg",
        ],
      },
      {
        id: "7075",
        title: "AA 7075-T651 Bar",
        subtitle: "High-strength aerospace grade",
        rating: 4.9,
        price: "From â‚¬6.10/kg",
        tags: ["Bar", "Aerospace", "High Strength"],
        cover: "/assets/aluminum/bar-7075.jpg",
        short:
          "Exceptional strength. Popular for tooling, jigs, and high-load components.",
        long:
          "7075-T651 has zinc as the primary alloying element, strong fatigue strength, average machinability. Not recommended for welding.",
        files: [
          { name: "7075_T651_DataSheet.pdf", size: "612 KB", type: "PDF" },
          { name: "Heat_Treatment_Guide.pdf", size: "219 KB", type: "PDF" },
        ],
        images: ["/assets/aluminum/airframe.jpg", "/assets/aluminum/tooling.jpg"],
      },
      {
        id: "5083",
        title: "AA 5083-H116 Sheet",
        subtitle: "Marine corrosion resistance",
        rating: 4.6,
        price: "From â‚¬4.48/kg",
        tags: ["Sheet", "Marine", "Corrosion Resistant"],
        cover: "/assets/aluminum/sheet-5083.jpg",
        short: "Outstanding seawater corrosion resistance; ideal for hulls and decks.",
        long:
          "5083-H116 performs in extreme environments and retains strength after welding. Common in shipbuilding, pressure vessels and cryogenics.",
        files: [{ name: "5083_WPS_Notes.pdf", size: "154 KB", type: "PDF" }],
        images: ["/assets/aluminum/hull.jpg"],
      },
      {
        id: "3003",
        title: "AA 3003 Coil",
        subtitle: "Formable & economical",
        rating: 4.3,
        price: "From â‚¬2.41/kg",
        tags: ["Coil", "Forming", "Food-grade"],
        cover: "/assets/aluminum/coil-3003.jpg",
        short:
          "Great corrosion resistance and workability for panels, ducts, and cladding.",
        long:
          "3003 is aluminum-manganese with moderate strength and excellent workability. Used for chemical equipment, HVAC fins, and trim.",
        files: [{ name: "3003_Chem_Comp.csv", size: "4 KB", type: "CSV" }],
        images: ["/assets/aluminum/coils.jpg"],
      },
    ];
  }, [items]);

  const openModal = (item) => {
    setActive(item);
    onOpen && onOpen(item);
  };

  // util for keyboard activation on role="button"
  const kActivate = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn(e);
    }
  };

  return (
    <div className="w-full min-h-[60vh]">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Materials</h2>
        <p className="text-sm text-neutral-400">
          Hover a card for a quick peek. Click <span className="font-medium">Open</span> to see full details.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {data.map((item) => (
          <motion.div
            key={item.id}
            className="group relative overflow-hidden rounded-2xl bg-neutral-800/50 ring-1 ring-black/10 hover:ring-white/10"
            initial={false}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="relative aspect-[4/5] w-full">
              {item.cover ? (
                <img
                  src={item.cover}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-700/60 via-sky-900 to-black" />
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
              <div className="absolute left-3 top-3 right-3">
                <div className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white/90 backdrop-blur">
                  <Star className="h-3 w-3 -mt-[1px]" />
                  <span>{(item.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>

              <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
                <div className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white/80 backdrop-blur">
                  {item.title}
                </div>
                {item.price && (
                  <div className="rounded-lg bg-black/30 px-2 py-1 text-[11px] text-white/70 backdrop-blur">
                    {item.price}
                  </div>
                )}
              </div>

              {/* HOVER OVERLAY (quick peek) */}
              <div className="absolute inset-0 flex items-end">
                <div
                  className="opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out w-full p-3"
                >
                  <div className="rounded-xl bg-black/70 p-3 text-white/90 backdrop-blur-md ring-1 ring-white/10">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-[11px] text-white/60">{item.subtitle}</div>
                    </div>
                    <p className="line-clamp-2 text-xs text-white/80">
                      {item.short || "Quick overview not provided."}
                    </p>

                    {item.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* actions â€” NOT <button> to avoid nested-button hydration issues */}
                    <div className="mt-3 flex items-center gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Open details"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(item);
                        }}
                        onKeyDown={kActivate(() => openModal(item))}
                        className="inline-flex items-center gap-1 rounded-lg bg-white text-black px-3 py-1.5 text-xs font-semibold
                                   hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
                      >
                        Open
                        <ChevronRight className="h-4 w-4" />
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Save"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={kActivate(() => {})}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/90
                                   hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                        title="Save"
                      >
                        <Bookmark className="h-4 w-4" />
                        Save
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Share"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={kActivate(() => {})}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/90
                                   hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                        title="Share"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActive(null)}
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10"
              role="dialog"
              aria-modal="true"
            >
              <div className="relative h-56 w-full">
                {active.cover ? (
                  <img
                    src={active.cover}
                    alt={active.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-sky-900 to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{active.title}</h3>
                    <p className="text-sm text-white/70">{active.subtitle}</p>
                  </div>
                  <div className="rounded-lg bg-black/50 px-2 py-1 text-white/90 backdrop-blur ring-1 ring-white/10">
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4" />
                      {(active.rating ?? 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.5fr_1fr]">
                <div className="p-4 md:p-6">
                  <h4 className="mb-2 text-sm font-semibold text-white/90">Overview</h4>
                  <p className="text-sm leading-6 text-white/80">
                    {active.long ||
                      "Detailed view with rich content. Use this space to show aluminum alloy specs, manufacturing notes, compliance, images, and links."}
                  </p>

                  {active.images?.length ? (
                    <>
                      <h4 className="mt-6 mb-2 text-sm font-semibold text-white/90">Gallery</h4>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {active.images.map((src, i) => (
                          <div key={i} className="overflow-hidden rounded-lg ring-1 ring-white/10">
                            <img src={src} alt={`preview-${i + 1}`} className="h-28 w-full object-cover md:h-32" />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="border-t border-white/10 p-4 md:border-l md:border-t-0 md:p-6">
                  <div className="space-y-3">
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40">
                      <Download className="h-4 w-4" />
                      Request Quote
                    </button>
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30">
                      <ExternalLink className="h-4 w-4" />
                      Open Datasheet
                    </button>
                  </div>

                  <h4 className="mt-6 mb-2 text-sm font-semibold text-white/90">Attachments</h4>
                  <ul className="space-y-2">
                    {(active.files ?? []).map((f) => (
                      <li key={f.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-white/70" />
                          <div>
                            <div className="text-sm text-white/90">{f.name}</div>
                            <div className="text-[11px] text-white/60">
                              {f.type || "File"} {f.size ? `Â· ${f.size}` : ""}
                            </div>
                          </div>
                        </div>
                        <button className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/90 hover:bg-white/15">
                          View
                        </button>
                      </li>
                    ))}
                    {!active.files?.length && (
                      <li className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10">
                        No files attached.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 md:px-6">
                <div className="text-xs text-white/60">{active.tags?.join(" Â· ")}</div>
                <button
                  onClick={() => setActive(null)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


