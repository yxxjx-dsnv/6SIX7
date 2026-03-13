npm install lucide-react framer-motion

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, ChevronRight, Activity, Wifi, Clock3, Search, RefreshCw, Layers3, ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

type OccupancyLevel = "low" | "mid" | "high";
type Trend = "up" | "down" | "stable";

type FloorData = {
  floor: string;
  occupancyPercent: number;
  lastUpdated: string;
};

type BuildingData = {
  id: string;
  name: string;
  shortName: string;
  occupancyPercent: number;
  floors: FloorData[];
  emergency: boolean;
  emergencyMessage?: string;
  statusNote?: string;
  lastUpdated: string;
  services: string[];
};

type BuildingApiShape = {
  id: string;
  name: string;
  shortName?: string;
  occupancyPercent: number;
  floors: { floor: string; occupancyPercent: number; lastUpdated?: string }[];
  emergency?: boolean;
  emergencyMessage?: string;
  statusNote?: string;
  lastUpdated?: string;
  services?: string[];
};

const MOCK_BUILDINGS: BuildingData[] = [
  {
    id: "robarts-commons",
    name: "Robarts Commons",
    shortName: "Robarts",
    occupancyPercent: 82,
    emergency: false,
    statusNote: "Study spaces filling quickly.",
    lastUpdated: "2 mins ago",
    services: ["Study Space", "Quiet Zones", "Group Rooms"],
    floors: [
      { floor: "1F", occupancyPercent: 58, lastUpdated: "2 mins ago" },
      { floor: "2F", occupancyPercent: 89, lastUpdated: "2 mins ago" },
      { floor: "3F", occupancyPercent: 84, lastUpdated: "2 mins ago" },
      { floor: "4F", occupancyPercent: 41, lastUpdated: "2 mins ago" },
    ],
  },
  {
    id: "gerstein-library",
    name: "Gerstein Science Information Centre",
    shortName: "Gerstein",
    occupancyPercent: 37,
    emergency: true,
    emergencyMessage: "Temporary elevator disruption reported. Use alternate route.",
    statusNote: "Lower traffic than usual.",
    lastUpdated: "1 min ago",
    services: ["Silent Study", "Computers", "Medical Sciences"],
    floors: [
      { floor: "1F", occupancyPercent: 61, lastUpdated: "1 min ago" },
      { floor: "2F", occupancyPercent: 46, lastUpdated: "1 min ago" },
      { floor: "3F", occupancyPercent: 28, lastUpdated: "1 min ago" },
      { floor: "4F", occupancyPercent: 17, lastUpdated: "1 min ago" },
    ],
  },
  {
    id: "bahen-centre",
    name: "Bahen Centre for Information Technology",
    shortName: "Bahen",
    occupancyPercent: 64,
    emergency: false,
    statusNote: "Moderate building traffic.",
    lastUpdated: "3 mins ago",
    services: ["Labs", "Study Space", "Lecture Halls"],
    floors: [
      { floor: "1F", occupancyPercent: 73, lastUpdated: "3 mins ago" },
      { floor: "2F", occupancyPercent: 67, lastUpdated: "3 mins ago" },
      { floor: "3F", occupancyPercent: 55, lastUpdated: "3 mins ago" },
      { floor: "4F", occupancyPercent: 48, lastUpdated: "3 mins ago" },
    ],
  },
  {
    id: "sidney-smith",
    name: "Sidney Smith Hall",
    shortName: "Sidney Smith",
    occupancyPercent: 29,
    emergency: false,
    statusNote: "Mostly open right now.",
    lastUpdated: "4 mins ago",
    services: ["Study Area", "Classrooms", "Transit Nearby"],
    floors: [
      { floor: "1F", occupancyPercent: 35, lastUpdated: "4 mins ago" },
      { floor: "2F", occupancyPercent: 31, lastUpdated: "4 mins ago" },
      { floor: "3F", occupancyPercent: 24, lastUpdated: "4 mins ago" },
      { floor: "4F", occupancyPercent: 18, lastUpdated: "4 mins ago" },
    ],
  },
];

function levelFromPercent(percent: number): OccupancyLevel {
  if (percent >= 75) return "high";
  if (percent >= 40) return "mid";
  return "low";
}

function trendFromFloorData(current: number, average: number): Trend {
  if (current - average >= 8) return "up";
  if (average - current >= 8) return "down";
  return "stable";
}

function statusStyles(level: OccupancyLevel) {
  if (level === "high") {
    return {
      label: "High",
      pill: "bg-red-500/15 text-red-700 border-red-400/30",
      dot: "bg-red-500",
      ring: "ring-red-500/20",
      progressClass: "[&>div]:bg-red-500",
      soft: "from-red-500/10 to-red-500/0",
    };
  }
  if (level === "mid") {
    return {
      label: "Mid",
      pill: "bg-orange-500/15 text-orange-700 border-orange-400/30",
      dot: "bg-orange-500",
      ring: "ring-orange-500/20",
      progressClass: "[&>div]:bg-orange-500",
      soft: "from-orange-500/10 to-orange-500/0",
    };
  }
  return {
    label: "Low",
    pill: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    progressClass: "[&>div]:bg-emerald-500",
    soft: "from-emerald-500/10 to-emerald-500/0",
  };
}

function trendMeta(trend: Trend) {
  if (trend === "up") return { label: "Increasing", icon: TrendingUp };
  if (trend === "down") return { label: "Decreasing", icon: TrendingDown };
  return { label: "Stable", icon: Minus };
}

function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeApiPayload(payload: BuildingApiShape[]): BuildingData[] {
  return payload.map((b) => ({
    id: b.id,
    name: b.name,
    shortName: b.shortName ?? b.name,
    occupancyPercent: Math.max(0, Math.min(100, b.occupancyPercent)),
    emergency: Boolean(b.emergency),
    emergencyMessage: b.emergencyMessage,
    statusNote: b.statusNote,
    lastUpdated: b.lastUpdated ?? "Just now",
    services: b.services ?? [],
    floors: (b.floors ?? []).map((f) => ({
      floor: f.floor,
      occupancyPercent: Math.max(0, Math.min(100, f.occupancyPercent)),
      lastUpdated: f.lastUpdated ?? "Just now",
    })),
  }));
}

async function fetchBuildings(): Promise<BuildingData[]> {
  const response = await fetch("/api/buildings", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch building data");
  const json = (await response.json()) as BuildingApiShape[];
  return normalizeApiPayload(json);
}

function useBuildingData() {
  const [buildings, setBuildings] = useState<BuildingData[]>(MOCK_BUILDINGS);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState<"mock" | "api">("mock");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(formatTimeLabel(new Date()));

  const refreshFromMock = () => {
    const next = MOCK_BUILDINGS.map((building) => {
      const delta = Math.floor(Math.random() * 13) - 6;
      const nextOccupancy = Math.max(5, Math.min(96, building.occupancyPercent + delta));
      return {
        ...building,
        occupancyPercent: nextOccupancy,
        lastUpdated: "Just now",
        floors: building.floors.map((f) => {
          const floorDelta = Math.floor(Math.random() * 15) - 7;
          return {
            ...f,
            occupancyPercent: Math.max(5, Math.min(96, f.occupancyPercent + floorDelta)),
            lastUpdated: "Just now",
          };
        }),
      };
    });
    setBuildings(next);
    setLastRefresh(formatTimeLabel(new Date()));
  };

  const refreshFromApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBuildings();
      setBuildings(data);
      setLastRefresh(formatTimeLabel(new Date()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (liveMode === "mock") return;
    void refreshFromApi();
    const interval = setInterval(() => {
      void refreshFromApi();
    }, 10000);
    return () => clearInterval(interval);
  }, [liveMode]);

  return {
    buildings,
    loading,
    error,
    liveMode,
    setLiveMode,
    lastRefresh,
    refreshNow: () => (liveMode === "api" ? refreshFromApi() : refreshFromMock()),
  };
}

function StatusPill({ level }: { level: OccupancyLevel }) {
  const styles = statusStyles(level);
  return (
    <Badge className={`border ${styles.pill} rounded-full px-3 py-1 font-medium`}>
      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${styles.dot}`} />
      {styles.label}
    </Badge>
  );
}

function TrendPill({ trend }: { trend: Trend }) {
  const meta = trendMeta(trend);
  const Icon = meta.icon;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.label}</span>
    </div>
  );
}

function BuildingRow({
  building,
  selected,
  onClick,
}: {
  building: BuildingData;
  selected: boolean;
  onClick: () => void;
}) {
  const level = levelFromPercent(building.occupancyPercent);
  const styles = statusStyles(level);
  const floorAverage = building.floors.reduce((acc, f) => acc + f.occupancyPercent, 0) / Math.max(1, building.floors.length);
  const trend = trendFromFloorData(building.occupancyPercent, floorAverage);

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.997 }}
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? `border-slate-900 bg-slate-900 text-white shadow-lg`
          : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-white/10" : "bg-slate-100"}`}>
              <Building2 className={`h-5 w-5 ${selected ? "text-white" : "text-slate-700"}`} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold md:text-base">{building.shortName}</div>
              <div className={`truncate text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>{building.name}</div>
            </div>
          </div>
        </div>
        <ChevronRight className={`mt-1 h-4 w-4 shrink-0 ${selected ? "text-white/70" : "text-slate-400"}`} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-2xl font-bold">{building.occupancyPercent}%</div>
        <div className="flex items-center gap-2">
          {building.emergency && (
            <Badge className={`rounded-full border-0 ${selected ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}>
              Alert
            </Badge>
          )}
          <div className={selected ? "[&_span]:text-white [&_span]:border-white/20" : ""}>
            <StatusPill level={level} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <TrendPill trend={trend} />
        <div className={`text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>Updated {building.lastUpdated}</div>
      </div>

      <div className={`mt-3 rounded-full bg-gradient-to-r ${styles.soft} p-[1px]`}>
        <div className={`rounded-full ${selected ? "bg-white/10" : "bg-slate-50"} p-1`}>
          <Progress value={building.occupancyPercent} className={`h-2 ${styles.progressClass}`} />
        </div>
      </div>
    </motion.button>
  );
}

function FloorCard({ floor }: { floor: FloorData }) {
  const level = levelFromPercent(floor.occupancyPercent);
  const styles = statusStyles(level);
  return (
    <motion.div layout className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Floor</div>
          <div className="text-lg font-semibold text-slate-900">{floor.floor}</div>
        </div>
        <StatusPill level={level} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold tracking-tight text-slate-900">{floor.occupancyPercent}%</div>
          <div className="mt-1 text-xs text-slate-500">Updated {floor.lastUpdated}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Density</div>
      </div>
      <div className="mt-4">
        <Progress value={floor.occupancyPercent} className={`h-2.5 ${styles.progressClass}`} />
      </div>
    </motion.div>
  );
}

function SummaryStat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<any>; label: string; value: string; sub?: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
          </div>
          <div className="rounded-xl bg-slate-100 p-2.5">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CampusPulseFrontend() {
  const { buildings, loading, error, liveMode, setLiveMode, lastRefresh, refreshNow } = useBuildingData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"crowded" | "quiet" | "alphabetical">("crowded");
  const [selectedId, setSelectedId] = useState<string>(MOCK_BUILDINGS[0].id);

  const filteredBuildings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = buildings.filter((b) => !q || b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q));
    const sorted = [...filtered];
    if (sort === "crowded") sorted.sort((a, b) => b.occupancyPercent - a.occupancyPercent);
    if (sort === "quiet") sorted.sort((a, b) => a.occupancyPercent - b.occupancyPercent);
    if (sort === "alphabetical") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [buildings, search, sort]);

  useEffect(() => {
    if (!filteredBuildings.some((b) => b.id === selectedId) && filteredBuildings[0]) {
      setSelectedId(filteredBuildings[0].id);
    }
  }, [filteredBuildings, selectedId]);

  const selectedBuilding = filteredBuildings.find((b) => b.id === selectedId) ?? buildings.find((b) => b.id === selectedId) ?? filteredBuildings[0] ?? buildings[0];

  const alerts = useMemo(() => buildings.filter((b) => b.emergency), [buildings]);
  const avgOccupancy = useMemo(() => {
    if (!buildings.length) return 0;
    return Math.round(buildings.reduce((acc, b) => acc + b.occupancyPercent, 0) / buildings.length);
  }, [buildings]);
  const availableCount = useMemo(() => buildings.filter((b) => levelFromPercent(b.occupancyPercent) === "low").length, [buildings]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_35%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff_55%,_#f8fafc)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  <Wifi className="h-3.5 w-3.5" />
                  Campus Pulse
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Live Campus Occupancy Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Building-level crowd status, floor-by-floor density, and emergency alerts. Ready to switch from mock data to real occupancy system later.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant={liveMode === "mock" ? "default" : "outline"} className="rounded-xl" onClick={() => setLiveMode("mock")}>
                  Mock Mode
                </Button>
                <Button variant={liveMode === "api" ? "default" : "outline"} className="rounded-xl" onClick={() => setLiveMode("api")}>
                  API Mode
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={refreshNow}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStat icon={Building2} label="Tracked Buildings" value={String(buildings.length)} sub="Current supported locations" />
              <SummaryStat icon={Activity} label="Avg Occupancy" value={`${avgOccupancy}%`} sub="Across all tracked buildings" />
              <SummaryStat icon={Layers3} label="Low-Density Buildings" value={String(availableCount)} sub="Good options right now" />
              <SummaryStat icon={ShieldAlert} label="Active Alerts" value={String(alerts.length)} sub={`Last refresh ${lastRefresh}`} />
            </div>
          </div>

          <AnimatePresence>
            {alerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Active building alerts</div>
                    <div className="mt-1 text-sm">
                      {alerts.map((a) => `${a.shortName}: ${a.emergencyMessage ?? "Emergency reported."}`).join(" • ")}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Supported Buildings</CardTitle>
                <CardDescription>Select a building to view floor-by-floor density.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buildings" className="rounded-xl pl-9" />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="crowded">Most crowded</option>
                    <option value="quiet">Least crowded</option>
                    <option value="alphabetical">A → Z</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Low
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Mid
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> High
                  </div>
                </div>

                <Separator />

                <ScrollArea className="h-[580px] pr-3">
                  <div className="space-y-3">
                    {filteredBuildings.map((building) => (
                      <BuildingRow
                        key={building.id}
                        building={building}
                        selected={selectedBuilding?.id === building.id}
                        onClick={() => setSelectedId(building.id)}
                      />
                    ))}

                    {filteredBuildings.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No buildings match your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
            {selectedBuilding ? (
              <div className="space-y-6">
                <Card className="overflow-hidden rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
                  <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.02),rgba(99,102,241,0.06))] p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                          <Clock3 className="h-3.5 w-3.5" />
                          Updated {selectedBuilding.lastUpdated}
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-950">{selectedBuilding.name}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          {selectedBuilding.statusNote ?? "Live building density and service status overview."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedBuilding.services.map((service) => (
                            <Badge key={service} variant="outline" className="rounded-full px-3 py-1 text-slate-700">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="min-w-[220px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Current occupancy</div>
                        <div className="mt-2 text-5xl font-bold tracking-tight text-slate-950">{selectedBuilding.occupancyPercent}%</div>
                        <div className="mt-3 flex items-center gap-2">
                          <StatusPill level={levelFromPercent(selectedBuilding.occupancyPercent)} />
                          <TrendPill
                            trend={trendFromFloorData(
                              selectedBuilding.occupancyPercent,
                              selectedBuilding.floors.reduce((acc, f) => acc + f.occupancyPercent, 0) / Math.max(1, selectedBuilding.floors.length)
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <SummaryStat icon={Activity} label="Building Status" value={statusStyles(levelFromPercent(selectedBuilding.occupancyPercent)).label} sub="Based on occupancy thresholds" />
                      <SummaryStat icon={Layers3} label="Floors Tracked" value={String(selectedBuilding.floors.length)} sub="Floor-level detail available" />
                      <SummaryStat icon={ShieldAlert} label="Emergency Status" value={selectedBuilding.emergency ? "Alert" : "Normal"} sub={selectedBuilding.emergency ? "Attention recommended" : "No active alert"} />
                    </div>

                    {selectedBuilding.emergency && (
                      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                          <div>
                            <div className="font-semibold">Emergency / service alert</div>
                            <div className="mt-1 text-sm">{selectedBuilding.emergencyMessage ?? "An emergency has been reported in this building."}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Floor Details</CardTitle>
                    <CardDescription>Per-floor density snapshot for the selected building.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="cards" className="w-full">
                      <TabsList className="mb-5 grid w-full grid-cols-2 rounded-xl bg-slate-100">
                        <TabsTrigger value="cards" className="rounded-lg">Cards</TabsTrigger>
                        <TabsTrigger value="table" className="rounded-lg">Table</TabsTrigger>
                      </TabsList>

                      <TabsContent value="cards">
                        <div className="grid gap-4 md:grid-cols-2">
                          {selectedBuilding.floors.map((floor) => (
                            <FloorCard key={floor.floor} floor={floor} />
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="table">
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                          <div className="grid grid-cols-[120px_1fr_140px_120px] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                            <div>Floor</div>
                            <div>Status</div>
                            <div>Occupancy</div>
                            <div>Updated</div>
                          </div>
                          {selectedBuilding.floors.map((floor) => {
                            const level = levelFromPercent(floor.occupancyPercent);
                            return (
                              <div key={floor.floor} className="grid grid-cols-[120px_1fr_140px_120px] items-center border-t border-slate-200 px-4 py-3 text-sm">
                                <div className="font-medium text-slate-900">{floor.floor}</div>
                                <div><StatusPill level={level} /></div>
                                <div className="font-semibold text-slate-900">{floor.occupancyPercent}%</div>
                                <div className="text-slate-500">{floor.lastUpdated}</div>
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle>API Integration Notes</CardTitle>
                    <CardDescription>Swap mock mode for real data without changing the UI structure.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700">
                    <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 overflow-x-auto">
{`GET /api/buildings

[
  {
    "id": "robarts-commons",
    "name": "Robarts Commons",
    "shortName": "Robarts",
    "occupancyPercent": 82,
    "emergency": false,
    "emergencyMessage": "",
    "statusNote": "Study spaces filling quickly.",
    "lastUpdated": "Just now",
    "services": ["Study Space", "Quiet Zones"],
    "floors": [
      { "floor": "1F", "occupancyPercent": 58, "lastUpdated": "Just now" },
      { "floor": "2F", "occupancyPercent": 89, "lastUpdated": "Just now" }
    ]
  }
]`}
                    </div>
                    <div className="text-slate-600">
                      Current UI already supports both mock data and API mode. When the real system is ready, point <span className="font-mono text-slate-900">fetch("/api/buildings")</span> to your backend route and keep the payload shape above.
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="rounded-3xl border-slate-200 bg-white p-10 text-center shadow-sm">
                <CardTitle>No building selected</CardTitle>
              </Card>
            )}
          </motion.div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            API mode error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
