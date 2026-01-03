import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Car, 
  DollarSign, 
  Calendar,
  Route,
  Fuel
} from "lucide-react";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DriverInfo {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  assigned_vehicle_id?: string;
}

interface Shift {
  id: string;
  start_time: string;
  end_time?: string;
  start_mileage: number;
  end_mileage?: number;
  total_revenue: number;
  fuel_cost: number;
  status: string;
  vehicle_id: string;
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
}

const DriverDashboard = () => {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalShifts: 0,
    totalKm: 0,
    avgRevenuePerShift: 0,
    totalFuelCost: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDriverData();
    }
  }, [user]);

  const fetchDriverData = async () => {
    // Fetch driver profile linked to user
    const { data: driverData } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    setDriverInfo(driverData);

    // Fetch vehicles
    const { data: vehiclesData } = await supabase
      .from("vehicles")
      .select("id, model, plate_number")
      .eq("user_id", user?.id);

    setVehicles(vehiclesData || []);

    // Fetch shifts for this user (last 90 days)
    const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", user?.id)
      .gte("start_time", ninetyDaysAgo)
      .order("start_time", { ascending: false });

    const allShifts = shiftsData || [];
    setShifts(allShifts);

    // Calculate stats
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = startOfWeek(today, { locale: fr });
    const monthStart = startOfMonth(today);

    const completedShifts = allShifts.filter(s => s.status === "completed");

    const todayRevenue = completedShifts
      .filter(s => format(new Date(s.start_time), "yyyy-MM-dd") === todayStr)
      .reduce((sum, s) => sum + Number(s.total_revenue), 0);

    const weekRevenue = completedShifts
      .filter(s => new Date(s.start_time) >= weekStart)
      .reduce((sum, s) => sum + Number(s.total_revenue), 0);

    const monthRevenue = completedShifts
      .filter(s => new Date(s.start_time) >= monthStart)
      .reduce((sum, s) => sum + Number(s.total_revenue), 0);

    const totalKm = completedShifts.reduce((sum, s) => {
      if (s.end_mileage && s.start_mileage) {
        return sum + (s.end_mileage - s.start_mileage);
      }
      return sum;
    }, 0);

    const totalFuelCost = completedShifts.reduce((sum, s) => sum + Number(s.fuel_cost), 0);
    const totalRevenue = completedShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);

    setStats({
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalShifts: completedShifts.length,
      totalKm,
      avgRevenuePerShift: completedShifts.length > 0 ? totalRevenue / completedShifts.length : 0,
      totalFuelCost,
    });

    // Generate chart data (last 14 days)
    const chartDataArray = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayShifts = completedShifts.filter(
        s => format(new Date(s.start_time), "yyyy-MM-dd") === dateStr
      );
      const dayRevenue = dayShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);
      const dayFuel = dayShifts.reduce((sum, s) => sum + Number(s.fuel_cost), 0);

      chartDataArray.push({
        date: format(date, "dd MMM", { locale: fr }),
        revenus: dayRevenue,
        carburant: dayFuel,
        net: dayRevenue - dayFuel,
      });
    }
    setChartData(chartDataArray);

    setLoading(false);
  };

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : "Inconnu";
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return "En cours";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((end.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Tableau de bord Chauffeur
        </h1>
        {driverInfo && (
          <p className="text-muted-foreground">
            Bienvenue, {driverInfo.first_name} {driverInfo.last_name}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aujourd'hui
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats.todayRevenue.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">Revenus du jour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cette semaine
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.weekRevenue.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">Revenus hebdomadaires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ce mois
            </CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats.monthRevenue.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">Revenus mensuels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total shifts
            </CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalShifts}
            </div>
            <p className="text-xs text-muted-foreground">
              Moy: {stats.avgRevenuePerShift.toFixed(0)} CFA/shift
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kilomètres parcourus
            </CardTitle>
            <Route className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.totalKm.toLocaleString()} km
            </div>
            <Progress 
              value={Math.min((stats.totalKm / 5000) * 100, 100)} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sur les 90 derniers jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coût carburant
            </CardTitle>
            <Fuel className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.totalFuelCost.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalKm > 0 
                ? `${(stats.totalFuelCost / stats.totalKm).toFixed(1)} CFA/km` 
                : "0 CFA/km"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bénéfice net
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.monthRevenue - stats.totalFuelCost >= 0 ? 'text-accent' : 'text-destructive'
            }`}>
              {(stats.monthRevenue - stats.totalFuelCost).toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">
              Ce mois (revenus - carburant)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des revenus (14 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} CFA`} />
              <Legend />
              <Bar dataKey="revenus" fill="hsl(var(--accent))" name="Revenus" radius={[4, 4, 0, 0]} />
              <Bar dataKey="carburant" fill="hsl(var(--destructive))" name="Carburant" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Net Revenue Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution du bénéfice net</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} CFA`} />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Bénéfice net"
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Derniers shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {shifts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun shift enregistré
              </p>
            ) : (
              shifts.slice(0, 10).map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getVehicleName(shift.vehicle_id)}
                      </span>
                      <Badge variant={shift.status === "completed" ? "default" : "secondary"}>
                        {shift.status === "completed" ? "Terminé" : "En cours"}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(shift.start_time), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                      <span>Durée: {formatDuration(shift.start_time, shift.end_time)}</span>
                      {shift.end_mileage && shift.start_mileage && (
                        <span>{shift.end_mileage - shift.start_mileage} km</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">
                      {Number(shift.total_revenue).toFixed(0)} CFA
                    </p>
                    <p className="text-xs text-destructive">
                      -{Number(shift.fuel_cost).toFixed(0)} CFA carburant
                    </p>
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
