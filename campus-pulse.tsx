Campus-pulse-frontend
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
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
You are viewing a previous version
Restore this version to make edits

Restore this version

Back to latest version