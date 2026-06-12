"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Eye,
  MessageSquare,
  Mic,
  Volume2,
  Frame,
  RotateCcw,
} from "lucide-react";
import type { CostStats } from "@/hooks/useCostStats";

interface CostDashboardProps {
  stats: CostStats;
  totalCalls: number;
  frameSkipRate: number;
  onReset: () => void;
}

export function CostDashboard({
  stats,
  totalCalls,
  frameSkipRate,
  onReset,
}: CostDashboardProps) {
  return (
    <Card className="border-0 bg-card shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4" />
          成本统计
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* 总调用次数 */}
        <div className="rounded-lg bg-primary/10 p-3 text-center">
          <p className="text-2xl font-bold text-primary">{totalCalls}</p>
          <p className="text-xs text-muted-foreground">总 API 调用次数</p>
        </div>

        {/* 详细统计 */}
        <div className="grid grid-cols-2 gap-2">
          <StatItem
            icon={<Eye className="h-3.5 w-3.5" />}
            label="VLM 视觉"
            value={stats.vlmCalls}
          />
          <StatItem
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="LLM 文字"
            value={stats.llmCalls}
          />
          <StatItem
            icon={<Mic className="h-3.5 w-3.5" />}
            label="ASR 识别"
            value={stats.asrCalls}
          />
          <StatItem
            icon={<Volume2 className="h-3.5 w-3.5" />}
            label="TTS 合成"
            value={stats.ttsCalls}
          />
        </div>

        {/* 帧统计 */}
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">帧采样统计</p>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Frame className="h-3 w-3" />
              已发送
            </span>
            <Badge variant="default">{stats.framesSent}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Frame className="h-3 w-3" />
              已跳过
            </span>
            <Badge variant="secondary">{stats.framesSkipped}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>跳过率</span>
            <Badge variant="outline">{frameSkipRate}%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
