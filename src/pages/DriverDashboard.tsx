import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Car, DollarSign, Calendar, Route, Fuel } from "lucide-react";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DriverDashboard = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, totalShifts: 0, totalKm: 0, avgRevenuePerShift: 0, totalFuelCost: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => { if (user) fetchDriverData(); }, [user]);

  const fetchDriverData = async () => {
    const { data: driverData } = await supabase.from("drivers").select("*").eq("user_id", user?.id).maybeSingle();
    setDriverInfo(driverData);

    const { data: vehiclesData } = await supabase.from("vehicles").select("id, model, plate_number").eq("user_id", user?.id);
    setVehicles(vehiclesData || []);

    const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const { data: shiftsData } = await supabase.from("shifts").select("*").eq("user_id", user?.id).gte("start_time", ninetyDaysAgo).order("start_time", { ascending: false });

    const allShifts = shiftsData || [];
    setShifts(allShifts);

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { locale: fr });
    const monthStart = startOfMonth(today);
    const completedShifts = allShifts.filter(s => s.status === "completed");

    const todayRevenue = completedShifts.filter(s => format(new Date(s.start_time), "yyyy-MM-dd") === todayStr).reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const weekRevenue = completedShifts.filter(s => new Date(s.start_time) >= weekStart).reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const monthRevenue = completedShifts.filter(s => new Date(s.start_time) >= monthStart).reduce((sum, s) => sum + Number(s.total_revenue), 0);
    const totalKm = completedShifts.reduce((sum, s) => s.end_mileage && s.start_mileage ? sum + (s.end_mileage - s.start_mileage) : sum, 0);
    const totalFuelCost = completedShifts.reduce((sum, s) => sum + Number(s.fuel_cost), 0);
    const totalRevenue = completedShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);

    setStats({ todayRevenue, weekRevenue, monthRevenue, totalShifts: completedShifts.length, totalKm, avgRevenuePerShift: completedShifts.length > 0 ? totalRevenue / completedShifts.length : 0, totalFuelCost });

    const chartArr = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayShifts = completedShifts.filter(s => format(new Date(s.start_time), "yyyy-MM-dd") === dateStr);
      const dayRevenue = dayShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);
      const dayFuel = dayShifts.reduce((sum, s) => sum + Number(s.fuel_cost), 0);
      chartArr.push({ date: format(date, "dd MMM", { locale }), revenus: dayRevenue, carburant: dayFuel, net: dayRevenue - dayFuel });
    }
    setChartData(chartArr);
    setLoading(false);
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : t('common.unknown');
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return t('driverDashboard.inProgress');
    const hours = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((new Date(endTime).getTime() - new Date(startTime).getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('driverDashboard.title')}</h1>
        {driverInfo && <p className="text-muted-foreground">{t('driverDashboard.welcome', { name: `${driverInfo.first_name} ${driverInfo.last_name}` })}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.today')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.todayRevenue.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">{t('driverDashboard.todayRevenue')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.thisWeek')}</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.weekRevenue.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">{t('driverDashboard.weeklyRevenue')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.thisMonth')}</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.monthRevenue.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">{t('driverDashboard.monthlyRevenue')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('driverDashboard.totalShifts')}</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground">{t('driverDashboard.avgPerShift', { amount: stats.avgRevenuePerShift.toFixed(0) })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('driverDashboard.kmTraveled')}</CardTitle>
            <Route className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalKm.toLocaleString()} km</div>
            <Progress value={Math.min((stats.totalKm / 5000) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{t('driverDashboard.last90Days')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('driverDashboard.fuelCost')}</CardTitle>
            <Fuel className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.totalFuelCost.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">{stats.totalKm > 0 ? `${(stats.totalFuelCost / stats.totalKm).toFixed(1)} ${t('driverDashboard.perKm')}` : `0 ${t('driverDashboard.perKm')}`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('driverDashboard.netProfit')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.monthRevenue - stats.totalFuelCost >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {(stats.monthRevenue - stats.totalFuelCost).toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">{t('driverDashboard.thisMonth')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('driverDashboard.revenueEvolution')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} CFA`} />
              <Legend />
              <Bar dataKey="revenus" fill="hsl(var(--accent))" name={t('dashboard.revenue')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="carburant" fill="hsl(var(--destructive))" name={t('driverDashboard.fuelCost')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('driverDashboard.netProfitEvolution')}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} CFA`} />
              <Line type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} name={t('driverDashboard.netProfit')} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('driverDashboard.recentShifts')}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {shifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('driverDashboard.noShifts')}</p>
            ) : (
              shifts.slice(0, 10).map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getVehicleName(shift.vehicle_id)}</span>
                      <Badge variant={shift.status === "completed" ? "default" : "secondary"}>
                        {shift.status === "completed" ? t('common.completed') : t('driverDashboard.inProgress')}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{format(new Date(shift.start_time), "dd/MM/yyyy HH:mm", { locale })}</span>
                      <span>{t('driverDashboard.duration')}: {formatDuration(shift.start_time, shift.end_time)}</span>
                      {shift.end_mileage && shift.start_mileage && <span>{shift.end_mileage - shift.start_mileage} km</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">{Number(shift.total_revenue).toFixed(0)} CFA</p>
                    <p className="text-xs text-destructive">-{Number(shift.fuel_cost).toFixed(0)} CFA {t('driverDashboard.fuelCost').toLowerCase()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;
