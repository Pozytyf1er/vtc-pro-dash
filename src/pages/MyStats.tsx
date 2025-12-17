import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MapPin, Timer, Target } from "lucide-react";
import { format, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

const MyStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalKm: 0,
    shiftCount: 0,
    avgPerShift: 0,
    performancePercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { locale: fr });
    const monthStart = startOfMonth(today);

    const { data: shifts } = await supabase
      .from("shifts")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString());

    const todayShifts = (shifts || []).filter(
      (s) => s.end_time && format(new Date(s.end_time), "yyyy-MM-dd") === todayStr
    );
    const weekShifts = (shifts || []).filter(
      (s) => s.end_time && new Date(s.end_time) >= weekStart
    );

    const todayRevenue = todayShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const weekRevenue = weekShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const monthRevenue = (shifts || []).reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const totalKm = (shifts || []).reduce((sum, s) => sum + ((s.end_mileage || 0) - s.start_mileage), 0);
    const shiftCount = (shifts || []).length;
    const avgPerShift = shiftCount > 0 ? monthRevenue / shiftCount : 0;
    const performancePercent = Math.min(100, (avgPerShift / 150000) * 100);

    setStats({ todayRevenue, weekRevenue, monthRevenue, totalKm, shiftCount, avgPerShift, performancePercent });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const performanceLevel = stats.performancePercent >= 80 ? "excellent" : stats.performancePercent >= 50 ? "average" : "poor";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Ma Performance</h1>
        <p className="text-muted-foreground">Suivez vos résultats ce mois-ci</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold">{stats.todayRevenue.toLocaleString()} CFA</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{stats.weekRevenue.toLocaleString()} CFA</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-accent">{stats.monthRevenue.toLocaleString()} CFA</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Km parcourus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalKm.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Niveau de performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Moyenne par shift</span>
            <span className="font-semibold">{stats.avgPerShift.toLocaleString()} CFA</span>
          </div>
          <Progress value={stats.performancePercent} className="h-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{stats.shiftCount} shifts ce mois</span>
            <Badge className={performanceLevel === "excellent" ? "bg-accent" : performanceLevel === "average" ? "bg-warning" : "bg-destructive"}>
              {performanceLevel === "excellent" ? "Excellent" : performanceLevel === "average" ? "Moyen" : "À améliorer"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStats;
