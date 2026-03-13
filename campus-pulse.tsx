import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock3,
  Minus,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

type OccupancyLevel = "low" | "mid" | "high";
type Trend = "up" | "down" | "stable";
type PageView = "dashboard" | "building-detail" | "buildings";

type FloorData = {
  floor: string;
  occupancyPercent: number;
  lastUpdated: string;
};

type HourlyPoint = {
  time: string;
  occupancyPercent: number;
};

type BuildingData = {
  id: string;
  name: string;
  shortName: string;
  occupancyPercent: number;
  floors: FloorData[];
  hourlyTrend: HourlyPoint[];
  emergency: boolean;
  emergencyMessage?: string;
  statusNote?: string;
  lastUpdated: string;
  services: string[];
  operationHours: string;
  hoursNote?: string;
};

type BuildingApiShape = {
  id: string;
  name: string;
  shortName?: string;
  occupancyPercent: number;
  floors?: { floor: string; occupancyPercent: number; lastUpdated?: string }[];
  hourlyTrend?: { time: string; occupancyPercent: number }[];
  emergency?: boolean;
  emergencyMessage?: string;
  statusNote?: string;
  lastUpdated?: string;
  services?: string[];
  operationHours?: string;
  hoursNote?: string;
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
    operationHours: "Sun 10AM–12AM • Mon–Thu 24 Hours • Fri 12AM–11PM • Sat 9AM–10PM",
    hoursNote: "Robarts Common overnight access runs Sunday to Thursday during fall and winter terms.",
    floors: [
      { floor: "1F", occupancyPercent: 58, lastUpdated: "2 mins ago" },
      { floor: "2F", occupancyPercent: 89, lastUpdated: "2 mins ago" },
      { floor: "3F", occupancyPercent: 84, lastUpdated: "2 mins ago" },
      { floor: "4F", occupancyPercent: 41, lastUpdated: "2 mins ago" },
    ],
    hourlyTrend: [
      { time: "8AM", occupancyPercent: 18 },
      { time: "10AM", occupancyPercent: 42 },
      { time: "12PM", occupancyPercent: 63 },
      { time: "2PM", occupancyPercent: 79 },
      { time: "4PM", occupancyPercent: 88 },
      { time: "6PM", occupancyPercent: 83 },
      { time: "8PM", occupancyPercent: 54 },
      { time: "10PM", occupancyPercent: 27 },
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
    operationHours: "Open now; current closing time varies by day",
    hoursNote: "Gerstein hours are posted weekly on U of T Libraries and can change by date.",
    floors: [
      { floor: "1F", occupancyPercent: 61, lastUpdated: "1 min ago" },
      { floor: "2F", occupancyPercent: 46, lastUpdated: "1 min ago" },
      { floor: "3F", occupancyPercent: 28, lastUpdated: "1 min ago" },
      { floor: "4F", occupancyPercent: 17, lastUpdated: "1 min ago" },
    ],
    hourlyTrend: [
      { time: "8AM", occupancyPercent: 14 },
      { time: "10AM", occupancyPercent: 31 },
      { time: "12PM", occupancyPercent: 44 },
      { time: "2PM", occupancyPercent: 39 },
      { time: "4PM", occupancyPercent: 34 },
      { time: "6PM", occupancyPercent: 28 },
      { time: "8PM", occupancyPercent: 22 },
      { time: "10PM", occupancyPercent: 11 },
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
    operationHours: "General access often listed around 8AM–6PM; after-hours access may require authorization",
    hoursNote: "Bahen access can vary by room, lab, academic schedule, and authorization level.",
    floors: [
      { floor: "1F", occupancyPercent: 73, lastUpdated: "3 mins ago" },
      { floor: "2F", occupancyPercent: 67, lastUpdated: "3 mins ago" },
      { floor: "3F", occupancyPercent: 55, lastUpdated: "3 mins ago" },
      { floor: "4F", occupancyPercent: 48, lastUpdated: "3 mins ago" },
    ],
    hourlyTrend: [
      { time: "8AM", occupancyPercent: 22 },
      { time: "10AM", occupancyPercent: 47 },
      { time: "12PM", occupancyPercent: 56 },
      { time: "2PM", occupancyPercent: 68 },
      { time: "4PM", occupancyPercent: 71 },
      { time: "6PM", occupancyPercent: 58 },
      { time: "8PM", occupancyPercent: 34 },
      { time: "10PM", occupancyPercent: 15 },
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
    operationHours: "Mon–Thu 10AM–6:30PM • Fri 10AM–2PM",
    hoursNote: "These are Sidney Smith Commons hours on the ground floor, not necessarily the full building.",
    floors: [
      { floor: "1F", occupancyPercent: 35, lastUpdated: "4 mins ago" },
      { floor: "2F", occupancyPercent: 31, lastUpdated: "4 mins ago" },
      { floor: "3F", occupancyPercent: 24, lastUpdated: "4 mins ago" },
      { floor: "4F", occupancyPercent: 18, lastUpdated: "4 mins ago" },
    ],
    hourlyTrend: [
      { time: "8AM", occupancyPercent: 11 },
      { time: "10AM", occupancyPercent: 22 },
      { time: "12PM", occupancyPercent: 29 },
      { time: "2PM", occupancyPercent: 37 },
      { time: "4PM", occupancyPercent: 33 },
      { time: "6PM", occupancyPercent: 24 },
      { time: "8PM", occupancyPercent: 18 },
      { time: "10PM", occupancyPercent: 9 },
    ],
  },
];

function levelFromPercent(percent: number): OccupancyLevel {
  if (percent >= 75) return "high";
  if (percent >= 40) return "mid";
  return "low";
}

function trendFromValues(current: number, average: number): Trend {
  if (current - average >= 8) return "up";
  if (average - current >= 8) return "down";
  return "stable";
}

function statusStyles(level: OccupancyLevel) {
  if (level === "high") {
    return {
      label: "High",
      pill: "bg-red-500/15 text-red-700 border-red-300",
      dot: "bg-red-500",
      progressClass: "[&>div]:bg-red-500",
    };
  }

  if (level === "mid") {
    return {
      label: "Mid",
      pill: "bg-orange-500/15 text-orange-700 border-orange-300",
      dot: "bg-orange-500",
      progressClass: "[&>div]:bg-orange-500",
    };
  }

  return {
    label: "Low",
    pill: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
    dot: "bg-emerald-500",
    progressClass: "[&>div]:bg-emerald-500",
  };
}

function trendMeta(trend: Trend) {
  if (trend === "up") return { label: "Increasing", icon: TrendingUp };
  if (trend === "down") return { label: "Decreasing", icon: TrendingDown };
  return { label: "Stable", icon: Minus };
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeApiPayload(payload: BuildingApiShape[]): BuildingData[] {
  return payload.map((building) => ({
    id: building.id,
    name: building.name,
    shortName: building.shortName ?? building.name,
    occupancyPercent: Math.max(0, Math.min(100, building.occupancyPercent)),
    emergency: Boolean(building.emergency),
    emergencyMessage: building.emergencyMessage,
    statusNote: building.statusNote,
    lastUpdated: building.lastUpdated ?? "Just now",
    services: building.services ?? [],
    operationHours: building.operationHours ?? "Hours not available",
    hoursNote: building.hoursNote,
    floors: (building.floors ?? []).map((floor) => ({
      floor: floor.floor,
      occupancyPercent: Math.max(0, Math.min(100, floor.occupancyPercent)),
      lastUpdated: floor.lastUpdated ?? "Just now",
    })),
    hourlyTrend: (building.hourlyTrend ?? []).map((point) => ({
      time: point.time,
      occupancyPercent: Math.max(0, Math.min(100, point.occupancyPercent)),
    })),
  }));
}

async function fetchBuildings(): Promise<BuildingData[]> {
  const response = await fetch("/api/buildings", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch building data");
  }

  const json = (await response.json()) as BuildingApiShape[];
  return normalizeApiPayload(json);
}

function getRoundedCurrentHour() {
  const now = new Date();
  let hour = now.getHours();
  const minutes = now.getMinutes();
  if (minutes >= 30) hour += 1;
  return hour;
}

function timeLabelTo24Hour(label: string) {
  const match = label.match(/^(\d+)(AM|PM)$/);
  if (!match) return 0;
  const rawHour = Number(match[1]);
  const meridiem = match[2];
  if (meridiem === "AM") return rawHour === 12 ? 0 : rawHour;
  return rawHour === 12 ? 12 : rawHour + 12;
}

function getVisibleTrendData(building: BuildingData) {
  const roundedHour = getRoundedCurrentHour();
  const visible = building.hourlyTrend.filter((point) => timeLabelTo24Hour(point.time) <= roundedHour);
  return visible.length > 0 ? visible : building.hourlyTrend.slice(0, 1);
}

function getBestLocationRecommendation(buildings: BuildingData[]) {
  if (!buildings.length) {
    return { buildingName: "-", time: "-", occupancy: 0 };
  }

  const hour = getRoundedCurrentHour();
  const slots = [8, 10, 12, 14, 16, 18, 20, 22];

  let closestSlot = slots[0];
  slots.forEach((slot) => {
    if (Math.abs(slot - hour) < Math.abs(closestSlot - hour)) {
      closestSlot = slot;
    }
  });

  const slotLabelMap: Record<number, string> = {
    8: "8AM",
    10: "10AM",
    12: "12PM",
    14: "2PM",
    16: "4PM",
    18: "6PM",
    20: "8PM",
    22: "10PM",
  };

  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayLabel = `${displayHour}${hour >= 12 ? "PM" : "AM"}`;
  const targetLabel = slotLabelMap[closestSlot];

  let bestBuilding = buildings[0];
  let bestOccupancy = 100;

  buildings.forEach((building) => {
    const visiblePoints = getVisibleTrendData(building);
    const point = visiblePoints.find((entry) => entry.time === targetLabel) ?? visiblePoints[visiblePoints.length - 1];
    if (point && point.occupancyPercent < bestOccupancy) {
      bestOccupancy = point.occupancyPercent;
      bestBuilding = building;
    }
  });

  return {
    buildingName: bestBuilding.shortName,
    time: displayLabel,
    occupancy: bestOccupancy,
  };
}

export const __testCases = {
  levelFromPercent: [
    { input: 20, expected: "low" },
    { input: 50, expected: "mid" },
    { input: 80, expected: "high" },
  ],
  bestTime: getBestLocationRecommendation(MOCK_BUILDINGS),
  buildingCount: MOCK_BUILDINGS.length,
};

function useBuildingData() {
  const [buildings, setBuildings] = useState<BuildingData[]>(MOCK_BUILDINGS);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState<"mock" | "api">("mock");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>(formatClock(new Date()));

  const refreshFromMock = () => {
    setBuildings((current) =>
      current.map((building) => {
        const buildingDelta = Math.floor(Math.random() * 13) - 6;
        const nextOccupancy = Math.max(5, Math.min(96, building.occupancyPercent + buildingDelta));

        return {
          ...building,
          occupancyPercent: nextOccupancy,
          lastUpdated: "Just now",
          floors: building.floors.map((floor) => {
            const floorDelta = Math.floor(Math.random() * 15) - 7;
            return {
              ...floor,
              occupancyPercent: Math.max(5, Math.min(96, floor.occupancyPercent + floorDelta)),
              lastUpdated: "Just now",
            };
          }),
          hourlyTrend: building.hourlyTrend.map((point) => {
            const pointDelta = Math.floor(Math.random() * 9) - 4;
            return {
              ...point,
              occupancyPercent: Math.max(5, Math.min(96, point.occupancyPercent + pointDelta)),
            };
          }),
        };
      })
    );

    setLastRefresh(formatClock(new Date()));
  };

  const refreshFromApi = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBuildings();
      setBuildings(data);
      setLastRefresh(formatClock(new Date()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run an immediate refresh when mode changes
    if (liveMode === "api") {
      void refreshFromApi();
    } else {
      refreshFromMock();
    }

    // Auto refresh every 10 seconds
    const interval = setInterval(() => {
      if (liveMode === "api") {
        void refreshFromApi();
      } else {
        refreshFromMock();
      }
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
    refreshNow: () => {
      if (liveMode === "api") {
        void refreshFromApi();
      } else {
        refreshFromMock();
      }
    },
  };
}

function StatusPill({ level }: { level: OccupancyLevel }) {
  const styles = statusStyles(level);

  return (
    <Badge className={`rounded-full border px-3 py-1 font-medium ${styles.pill}`}>
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

function BestLocationBanner({ buildings }: { buildings: BuildingData[] }) {
  const recommendation = useMemo(() => getBestLocationRecommendation(buildings), [buildings]);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm">
      <div className="text-sm font-medium text-emerald-700">Best location recommendation</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-2xl font-bold">{recommendation.buildingName}</span>
        <span className="text-lg">best around {recommendation.time}</span>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          Current best estimate: {recommendation.occupancy}%
        </span>
      </div>
      <div className="mt-2 text-sm text-emerald-700">
        Recommended location based on occupancy data.
      </div>
    </div>
  );
}

function HoursCard({ operationHours, hoursNote }: { operationHours: string; hoursNote?: string }) {
  return (
    <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
      <CardHeader>
        <CardTitle>Operating Hours</CardTitle>
        <CardDescription>Useful access information for this location.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
              <Clock3 className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{operationHours}</div>
              {hoursNote ? <div className="mt-2 text-sm leading-6 text-slate-600">{hoursNote}</div> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BuildingDirectoryCard({
  building,
  onClick,
}: {
  building: BuildingData;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="min-w-0">
        <div className="text-lg font-semibold text-slate-900">{building.shortName}</div>
        <div className="text-sm text-slate-500">{building.name}</div>
        <div className="mt-1 text-xs text-slate-500">{building.operationHours}</div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        <div className="text-right">
          <div className="text-3xl font-bold tracking-tight text-slate-900">{building.occupancyPercent}%</div>
          <div className="text-xs text-slate-500">Updated {building.lastUpdated}</div>
        </div>
        <StatusPill level={levelFromPercent(building.occupancyPercent)} />
      </div>
    </button>
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

function OccupancyTrendChart({ building }: { building: BuildingData }) {
  const visibleTrend = useMemo(() => getVisibleTrendData(building), [building]);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={visibleTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip formatter={(value: number) => [`${value}%`, "Occupancy"]} />
          <Line type="monotone" dataKey="occupancyPercent" stroke="#0f172a" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function BuildingDetailPage({
  building,
  onBack,
}: {
  building: BuildingData;
  onBack: () => void;
}) {
  const floorAverage =
    building.floors.reduce((sum, floor) => sum + floor.occupancyPercent, 0) /
    Math.max(1, building.floors.length);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">{building.name}</h2>
          <p className="text-sm text-slate-600">Live building info, floor density, and daily trend.</p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.02),rgba(99,102,241,0.06))] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                <Clock3 className="h-3.5 w-3.5" />
                Updated {building.lastUpdated}
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-slate-950">{building.shortName}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {building.statusNote ?? "Live building density and service status overview."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {building.services.map((service) => (
                  <Badge key={service} variant="outline" className="rounded-full px-3 py-1 text-slate-700">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-slate-500">Current occupancy</div>
              <div className="mt-2 text-5xl font-bold tracking-tight text-slate-950">{building.occupancyPercent}%</div>
              <div className="mt-3 flex items-center gap-2">
                <StatusPill level={levelFromPercent(building.occupancyPercent)} />
                <TrendPill trend={trendFromValues(building.occupancyPercent, floorAverage)} />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {building.emergency && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">Emergency / service alert</div>
                  <div className="mt-1 text-sm">
                    {building.emergencyMessage ?? "An emergency has been reported in this building."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operating hours moved here to save vertical space */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                <Clock3 className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-700">Operating hours</div>
                <div className="text-base font-medium text-slate-900">{building.operationHours}</div>
                {building.hoursNote ? (
                  <div className="mt-1 text-sm text-slate-600">{building.hoursNote}</div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      

      <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
        <CardHeader>
          <CardTitle>Floor Details</CardTitle>
          <CardDescription>Per-floor density snapshot for the selected building.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="mb-5 ml-auto grid w-full max-w-[320px] grid-cols-2 rounded-xl bg-slate-100">
              <TabsTrigger value="cards" className="rounded-lg">
                Cards
              </TabsTrigger>
              <TabsTrigger value="table" className="rounded-lg">
                Table
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards">
              <div className="grid gap-4 md:grid-cols-2">
                {building.floors.map((floor) => (
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
                {building.floors.map((floor) => {
                  const level = levelFromPercent(floor.occupancyPercent);
                  return (
                    <div
                      key={floor.floor}
                      className="grid grid-cols-[120px_1fr_140px_120px] items-center border-t border-slate-200 px-4 py-3 text-sm"
                    >
                      <div className="font-medium text-slate-900">{floor.floor}</div>
                      <div>
                        <StatusPill level={level} />
                      </div>
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
          <CardTitle>Today’s Occupancy Trend</CardTitle>
          <CardDescription>See when this building is busier or quieter during the day.</CardDescription>
        </CardHeader>
        <CardContent>
          <OccupancyTrendChart building={building} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CampusPulseFrontend() {
  const { buildings, loading, error, liveMode, setLiveMode, lastRefresh, refreshNow } = useBuildingData();
  const [page, setPage] = useState<PageView>("dashboard");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"crowded" | "quiet" | "alphabetical">("crowded");
  const [selectedId, setSelectedId] = useState<string>(MOCK_BUILDINGS[0].id);

  const filteredBuildings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = buildings.filter(
      (building) =>
        !query ||
        building.name.toLowerCase().includes(query) ||
        building.shortName.toLowerCase().includes(query)
    );

    const sorted = [...filtered];
    if (sort === "crowded") sorted.sort((a, b) => b.occupancyPercent - a.occupancyPercent);
    if (sort === "quiet") sorted.sort((a, b) => a.occupancyPercent - b.occupancyPercent);
    if (sort === "alphabetical") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [buildings, search, sort]);

  useEffect(() => {
    if (!filteredBuildings.some((building) => building.id === selectedId) && filteredBuildings[0]) {
      setSelectedId(filteredBuildings[0].id);
    }
  }, [filteredBuildings, selectedId]);

  const selectedBuilding =
    filteredBuildings.find((building) => building.id === selectedId) ??
    buildings.find((building) => building.id === selectedId) ??
    filteredBuildings[0] ??
    buildings[0];

  const alerts = useMemo(() => buildings.filter((building) => building.emergency), [buildings]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_35%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff_55%,_#f8fafc)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-4">
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-xl shadow-slate-200/40 backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                    CP
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm tracking-wide text-slate-500">UofT Smart Campus</span>
                    <span className="text-xl font-semibold text-slate-950">Campus Pulse</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  Live Campus Occupancy Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  Building-level crowd status and floor-by-floor density. Designed for quick scanning and one-click building details.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={liveMode === "mock" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setLiveMode("mock")}
                >
                  Mock Mode
                </Button>
                <Button
                  variant={liveMode === "api" ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setLiveMode("api")}
                >
                  API Mode
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={refreshNow}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <BestLocationBanner buildings={buildings} />

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
                      {alerts
                        .map((building) => `${building.shortName}: ${building.emergencyMessage ?? "Emergency reported."}`)
                        .join(" • ")}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {page === "building-detail" && selectedBuilding ? (
          <BuildingDetailPage building={selectedBuilding} onBack={() => setPage("dashboard")} />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Supported Buildings</h2>
                <p className="text-sm text-slate-600">Click any building to open its detail page.</p>
              </div>
              {page === "buildings" && (
                <Button variant="outline" className="rounded-xl" onClick={() => setPage("dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>

            <Card className="rounded-3xl border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/30 backdrop-blur">
              <CardHeader>
                <CardTitle>Building Directory</CardTitle>
                <CardDescription>Choose a building to see its information page, floor details, and daily trend.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search supported buildings"
                      className="rounded-xl pl-9"
                    />
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "crowded" | "quiet" | "alphabetical")}
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

                <ScrollArea className="h-[620px] pr-3">
                  <div className="grid gap-3">
                    {filteredBuildings.map((building) => (
                      <BuildingDirectoryCard
                        key={building.id}
                        building={building}
                        onClick={() => {
                          setSelectedId(building.id);
                          setPage("building-detail");
                        }}
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
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            API mode error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
