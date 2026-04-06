import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Dot } from "lucide-react";
import { mapDataRaw } from '../constant/map_content';
import type { CityRecord, MapData, NodeData, OutageRecord, OutageRoute } from 'outage-tracker';
import PriorityModal from './PriorityModal';
import OutageModal from './OutageModal';
import RightPanel from './RightPanel';
import MapCanvas from './MapCanvas';
import { cityDataRaw } from '../constant/location_data';

/* Palette - Confirmed single palette used everywhere across the component */
/* Map bg       #f2ede6 */
/* Surface      #ffffff / #f8fafc */
/* Border       #e2e8f0 */
/* Text hi      #0f172a */
/* Text mid     #64748b */
/* Text lo      #94a3b8 */
/* Accent red   #dc2626  (source / critical) */
/* Accent blue  #1d4ed8  (route / active) */
/* Accent green #16a34a  (dest / ok) */
/* Orange       #ea580c  (high priority) */

/* Graph Configurations */
const mapData = mapDataRaw as MapData;
const SOURCE_NODE_ID = "eb_65";
const PADDING = 90;
const R_BASE = 6;
const R_SOURCE = 12;
const R_DEST = 10;
const R_PATH = 8;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.15;
const PAN_STEP = 60;

/**
 * Search users by phone number.
 * AVL-tree-ready: replace the body of this function with your AVL search.
 * Receives the raw input string; returns a (possibly empty) CityRecord array.
 */
const searchUsers = (input: string): CityRecord[] => {
  const q = input.trim();
  if (!q) return [];
  /* swap this block with AVL tree lookup */
  return cityDataRaw.filter((u) => u.phone.includes(q));
};

const DUMMY_OUTAGE_ROUTES: OutageRoute[] = [
  { id: "r1", label: "Node 82 — Nedungamuwa", nodePath: "65, 89, 25, 88", distance: "14.2", sector: "Sector A" },
  { id: "r2", label: "Node 74 — Gampaha", nodePath: "65, 23, 86, 83, 16, 85, 51, 52, 74", distance: "19.7", sector: "Sector B" },
  { id: "r3", label: "Node 90 — Hakuruwela", nodePath: "65, 64, 45, 37, 46, 44, 90", distance: "19.7", sector: "Sector B" },
];

/* Helper Methods */

const toNodeId = (n: number): string => {
  return n === 65 ? "eb_65" : `node_${n}`;
}

const nodeLabel = (id: string): string => {
  return id === "eb_65" ? "65" : id.replace("node_", "");
}

const edgeKey = (a: string, b: string): string => {
  return a < b ? `${a}¦${b}` : `${b}¦${a}`;
}

const parsePath = (raw: string): string[] => {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? toNodeId(n) : null;
    })
    .filter((id): id is string => id !== null);
}

const priorityColor = (p: number): { bg: string; border: string; text: string; badge: string } => {
  if (p >= 8) return { bg: "#fff1f2", border: "#fecaca", text: "#dc2626", badge: "#dc2626" };
  if (p >= 5) return { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c", badge: "#f97316" };
  return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", badge: "#22c55e" };
};

/* Component */

const CityMap = () => {

  /* Inject animation keyframes once */
  useEffect(() => {
    const ID = "city-map-styles";
    if (document.getElementById(ID)) return;
    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      @keyframes cmFlow {
        from { stroke-dashoffset: 24; }
        to   { stroke-dashoffset: 0; }
      }
      .cm-flow { stroke-dasharray: 8 4; animation: cmFlow 0.5s linear infinite; }
      @keyframes cmPulse {
        0%, 100% { opacity: 0.25; }
        50%       { opacity: 0.6; }
      }
      .cm-pulse { animation: cmPulse 2s ease-in-out infinite; }
      @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .outage-slide-up { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .fade-in { animation: fadeIn 0.2s ease both; }
      @keyframes scaleIn {
        from { transform: scale(0.94); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }
      .scale-in { animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes routeSlideIn {
        from { transform: translateY(-12px); opacity: 0; }
        to   { transform: translateY(0);     opacity: 1; }
      }
      .route-slide-in { animation: routeSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById(ID)?.remove(); };
  }, []);

  /* Pan / Zoom */
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  /* Refs mirror state so wheel handler always reads current values without stale closure */
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const panHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Map UI */
  const [activePath, setActivePath] = useState<string[]>([]);
  const [activeDistance, setActiveDistance] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* containerSize is kept in state (updated by ResizeObserver) so it's safe to read during render */
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Outage modal state */
  const [outageModalOpen, setOutageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "list">("report");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CityRecord[]>([]);
  const [outages, setOutages] = useState<OutageRecord[]>([]);

  /* Priority modal state */
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<CityRecord | null>(null);
  const [priorityLevel, setPriorityLevel] = useState<number>(5);

  /* Search handler */
  const handlePhoneSearch = useCallback((val: string) => {
    setPhoneSearch(val);
    setSearchResults(searchUsers(val));
  }, []);

  /* Open priority modal for a user */
  const handleReportOutageClick = useCallback((user: CityRecord) => {
    setPendingUser(user);
    setPriorityLevel(5);
    setPriorityModalOpen(true);
  }, []);

  /* Confirm outage with priority */
  const handleConfirmOutage = useCallback(() => {
    if (!pendingUser) return;
    const newOutage: OutageRecord = {
      id: pendingUser.phone,
      priority: priorityLevel,
      user: pendingUser,
      timestamp: Date.now(),
      isNew: true,
    };

    setOutages((prev) => {
      const filtered = prev.filter((o) => o.id !== newOutage.id);
      const merged = [newOutage, ...filtered].sort((a, b) => b.priority - a.priority);
      return merged;
    });

    setPriorityModalOpen(false);
    setPendingUser(null);
    setPhoneSearch("");
    setSearchResults([]);
    setActiveTab("list");

    setTimeout(() => {
      setOutages((prev) =>
        prev.map((o) => (o.id === newOutage.id ? { ...o, isNew: false } : o))
      );
    }, 600);

  }, [pendingUser, priorityLevel]);

  /* Keep refs in sync so the non-reactive wheel handler always reads fresh values */
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  /* Keyboard: arrow-key panning + +/- zoom */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as Element).closest("input, textarea")) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
        return;
      }

      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
        return;
      }

      const dirs: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: PAN_STEP },
        ArrowDown: { dx: 0, dy: -PAN_STEP },
        ArrowLeft: { dx: PAN_STEP, dy: 0 },
        ArrowRight: { dx: -PAN_STEP, dy: 0 },
      };

      const d = dirs[e.key];
      if (!d) return;
      e.preventDefault();
      setPan((p) => ({ x: p.x + d.dx, y: p.y + d.dy }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, []);

  /* Wheel zoom (non-passive) — zooms toward the cursor position */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) { return };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = scaleRef.current;
      const p = panRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = el.clientWidth;
      const H = el.clientHeight;

      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newS = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * factor));

      /* Compute the "base" screen point under the cursor (at scale=1, pan=0):
         sx = (bx - W/2) * s + W/2 + p.x  =>  bx = (sx - p.x - W/2) / s + W/2
         Then keep that same bx fixed at mx after applying newS:
         newPx = mx - (bx - W/2) * newS - W/2                                  */
      const bx = (mx - p.x - W / 2) / s + W / 2;
      const by = (my - p.y - H / 2) / s + H / 2;
      const newPx = mx - (bx - W / 2) * newS - W / 2;
      const newPy = my - (by - H / 2) * newS - H / 2;

      setScale(newS);
      setPan({ x: newPx, y: newPy });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); };
  }, []);

  /* Track container dimensions in state so tooltip can read them safely during render */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Precomputed map bounds */
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of mapData.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      w: maxX - minX + PADDING * 2,
      h: maxY - minY + PADDING * 2,
    };
  }, []);

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeData>();
    for (const n of mapData.nodes) m.set(n.id, n);
    return m;
  }, []);

  /* Derived active sets from path */
  const { activeEdgeKeys, activeNodeSet, destId, directedActiveEdges } = useMemo(() => {
    const activeEdgeKeys = new Set<string>();
    const activeNodeSet = new Set<string>(activePath);
    const directedActiveEdges = new Map<string, { fromId: string; toId: string }>();

    for (let i = 0; i < activePath.length - 1; i++) {
      const key = edgeKey(activePath[i], activePath[i + 1]);
      activeEdgeKeys.add(key);
      directedActiveEdges.set(key, { fromId: activePath[i], toId: activePath[i + 1] });
    }

    return {
      activeEdgeKeys,
      activeNodeSet,
      destId: activePath.length > 1 ? activePath.at(-1)! : null,
      directedActiveEdges,
    };
  }, [activePath]);

  /* Fit viewport smoothly so start and end nodes of a path are both visible */
  const fitPathToView = useCallback((pathIds: string[]) => {
    if (!containerRef.current || pathIds.length < 2) return;

    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    /* Reproduce the SVG's preserveAspectRatio="xMidYMid meet" base mapping */
    const baseScale = Math.min(W / bounds.w, H / bounds.h);
    const offsetX = (W - bounds.w * baseScale) / 2;
    const offsetY = (H - bounds.h * baseScale) / 2;

    /* Only use the first and last node — the user wants both endpoints in view */
    const endpoints = [pathIds[0], pathIds[pathIds.length - 1]]
      .map(id => nodeMap.get(id))
      .filter((n): n is NodeData => !!n)
      .map(n => ({
        x: (n.x - bounds.minX) * baseScale + offsetX,
        y: (n.y - bounds.minY) * baseScale + offsetY,
      }));

    if (!endpoints.length) return;

    const minX = Math.min(...endpoints.map(p => p.x));
    const maxX = Math.max(...endpoints.map(p => p.x));
    const minY = Math.min(...endpoints.map(p => p.y));
    const maxY = Math.max(...endpoints.map(p => p.y));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    /* Add a minimum span so single-node/coincident endpoints don't over-zoom */
    const spanW = Math.max(maxX - minX, 80);
    const spanH = Math.max(maxY - minY, 80);

    /* Math.min picks the MORE constrained axis — the correct "fit" formula */
    /* 65% fill keeps both endpoints comfortably inside with visible context around them */
    const fitScale = Math.min((W * 0.65) / spanW, (H * 0.65) / spanH, ZOOM_MAX);
    const newScale = Math.max(fitScale, ZOOM_MIN);

    /* Translate so the endpoint centroid lands at the viewport centre */
    const newPanX = -(cx - W / 2) * newScale;
    const newPanY = -(cy - H / 2) * newScale;

    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    setIsTransitioning(true);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
    transitionTimer.current = setTimeout(() => setIsTransitioning(false), 750);
  }, [bounds, nodeMap]);

  /* Route activation from side-panel button */
  const handleRouteFromOutage = useCallback((route: OutageRoute) => {
    const parsed = parsePath(route.nodePath);
    if (parsed.length >= 2) {
      setActivePath(parsed);
      setActiveDistance(route.distance);
      fitPathToView(parsed);
    }
  }, [fitPathToView]);

  const handleClearRoute = useCallback(() => {
    setActivePath([]);
    setActiveDistance("");
  }, []);

  /* Pre-parse route paths once so route-card comparisons don't re-run parsePath every render */
  const parsedRoutePaths = useMemo(
    () => new Map(DUMMY_OUTAGE_ROUTES.map((r) => [r.id, parsePath(r.nodePath)])),
    []
  );

  /* Arrow functions for zoom / reset */
  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
  const zoomOut = () => setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  /* Hold-to-pan */
  const stopContinuousPan = useCallback(() => {
    if (panHoldTimer.current) { clearTimeout(panHoldTimer.current); panHoldTimer.current = null; }
    if (panHoldInterval.current) { clearInterval(panHoldInterval.current); panHoldInterval.current = null; }
  }, []);

  const startContinuousPan = useCallback((dx: number, dy: number) => {
    stopContinuousPan();
    const step = () => setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    step();
    panHoldTimer.current = setTimeout(() => {
      panHoldInterval.current = setInterval(step, 40);
    }, 350);
  }, [stopContinuousPan]);

  const showWeightLabels = scale > 0.65;

  /* Render */

  return (
    <div
      className="relative flex h-screen overflow-hidden select-none"
      style={{ background: "#f2ede6", fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* District label — top-left */}
      <div
        className="absolute top-5 left-5 pointer-events-none bg-white z-50 px-3 py-2 rounded-lg"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" }}
      >
        <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          {mapData.metadata.district}
        </div>
        <div className="flex gap-x-1 items-center justify-start" style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
          <span>{mapData.metadata.node_count} Cities</span>
          <Dot size={18} strokeWidth={4} />
          <span>{mapData.metadata.edge_count} Roads</span>
        </div>
      </div>

      {/* - MAP CANVAS - */}
      <MapCanvas
        containerRef={containerRef}
        activeDistance={activeDistance}
        activePath={activePath}
        containerSize={containerSize}
        handleClearRoute={handleClearRoute}
        outages={outages}
        resetView={resetView}
        setActiveTab={setActiveTab}
        setOutageModalOpen={setOutageModalOpen}
        startContinuousPan={startContinuousPan}
        stopContinuousPan={stopContinuousPan}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        PAN_STEP={PAN_STEP}
        R_BASE={R_BASE}
        R_DEST={R_DEST}
        R_PATH={R_PATH}
        R_SOURCE={R_SOURCE}
        SOURCE_NODE_ID={SOURCE_NODE_ID}
        activeEdgeKeys={activeEdgeKeys}
        activeNodeSet={activeNodeSet}
        bounds={bounds}
        destId={destId}
        directedActiveEdges={directedActiveEdges}
        edgeKey={edgeKey}
        hoveredId={hoveredId}
        isTransitioning={isTransitioning}
        mapData={mapData}
        nodeLabel={nodeLabel}
        nodeMap={nodeMap}
        pan={pan}
        scale={scale}
        setHoveredId={setHoveredId}
        showWeightLabels={showWeightLabels}
      />

      {/* - RIGHT PANEL - */}
      <RightPanel
        activePath={activePath}
        handleClearRoute={handleClearRoute}
        handleRouteFromOutage={handleRouteFromOutage}
        outageRoutes={DUMMY_OUTAGE_ROUTES}
        outages={outages}
        parsedRoutePaths={parsedRoutePaths}
      />

      {/* - OUTAGE MODAL - */}
      {outageModalOpen && (
        <OutageModal
          activeTab={activeTab}
          handlePhoneSearch={handlePhoneSearch}
          handleReportOutageClick={handleReportOutageClick}
          mapData={mapData}
          outages={outages}
          phoneSearch={phoneSearch}
          priorityColor={priorityColor}
          searchResults={searchResults}
          setActiveTab={setActiveTab}
          setOutageModalOpen={setOutageModalOpen}
        />
      )}

      {/* - PRIORITY MODAL (on top) - */}
      {priorityModalOpen && pendingUser && (
        <PriorityModal
          handleConfirmOutage={handleConfirmOutage}
          pendingUser={pendingUser}
          priorityColor={priorityColor}
          priorityLevel={priorityLevel}
          setPendingUser={setPendingUser}
          setPriorityLevel={setPriorityLevel}
          setPriorityModalOpen={setPriorityModalOpen}
        />
      )}
    </div>
  );
};

export default CityMap;
