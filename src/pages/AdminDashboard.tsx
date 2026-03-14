import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, TrendingUp, TrendingDown, DollarSign, Fuel, Wrench, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface VehicleStat {
  id: string;
  model: string;
  plateNumber: string;
  revenue: number;
  expenses: number;
  profit: number;
  shifts: number;
  km: number;
}

interface DriverStat {
  id: string;
  firstName: string;
  lastName: string;
  revenue: number;
  shifts: number;
  avgPerShift: number;
  km: number;
  fuelCost: number;
}

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "fr" ? fr : enUS;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, profit: 0, vehicles: 0, drivers: 0, shifts: 0 });
  const [vehicleStats, setVehicleStats] = useState<VehicleStat[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStat[]>([]);
  const [revenueByVehicle, setRevenueByVehicle] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string }[]>([]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const monthStart = startOfMonth(new Date());

    const [
      { data: vehicles },
      { data: drivers },
      { data: shifts },
      { data: incomes },
      { data: expenses },
      { data: maintenance },
    ] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("shifts").select("*").gte("created_at", threeMonthsAgo.toISOString()),
      supabase.from("incomes").select("*").gte("date", format(monthStart, "yyyy-MM-dd")),
      supabase.from("expenses").select("*").gte("date", format(monthStart, "yyyy-MM-dd")),
      supabase.from("maintenance").select("*").gte("date", format(threeMonthsAgo, "yyyy-MM-dd")),
    ]);

    const totalRevenue = (incomes || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

    setTotals({
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      vehicles: (vehicles || []).length,
      drivers: (drivers || []).length,
      shifts: (shifts || []).filter(s => s.status === "completed").length,
    });

    // Vehicle stats
    const vStats: VehicleStat[] = (vehicles || []).map(v => {
      const vShifts = (shifts || []).filter(s => s.vehicle_id === v.id && s.status === "completed");
      const revenue = vShifts.reduce((s, sh) => s + Number(sh.total_revenue || 0), 0);
      const fuelCost = vShifts.reduce((s, sh) => s + Number(sh.fuel_cost || 0), 0);
      const maint = (maintenance || []).filter(m => m.vehicle_id === v.id).reduce((s, m) => s + Number(m.cost || 0), 0);
      const monthly = (Number(v.monthly_insurance_cost || 0) + Number(v.monthly_lease_cost || 0)) * 3;
      const totalExp = fuelCost + maint + monthly;
      const km = vShifts.reduce((s, sh) => s + Math.max(0, (sh.end_mileage || 0) - (sh.start_mileage || 0)), 0);
      return { id: v.id, model: v.model, plateNumber: v.plate_number, revenue, expenses: totalExp, profit: revenue - totalExp, shifts: vShifts.length, km };
    });
    setVehicleStats(vStats.sort((a, b) => b.profit - a.profit));
    setRevenueByVehicle(vStats.map(v => ({ name: `${v.model}`, revenue: v.revenue, expenses: v.expenses })));

    // Driver stats
    const dStats: DriverStat[] = (drivers || []).map(d => {
      const dShifts = (shifts || []).filter(s => s.driver_id === d.id && s.status === "completed");
      const revenue = dShifts.reduce((s, sh) => s + Number(sh.total_revenue || 0), 0);
      const fuelCost = dShifts.reduce((s, sh) => s + Number(sh.fuel_cost || 0), 0);
      const km = dShifts.reduce((s, sh) => s + Math.max(0, (sh.end_mileage || 0) - (sh.start_mileage || 0)), 0);
      return {
        id: d.id, firstName: d.first_name, lastName: d.last_name,
        revenue, shifts: dShifts.length, avgPerShift: dShifts.length > 0 ? revenue / dShifts.length : 0, km, fuelCost,
      };
    });
    setDriverStats(dStats.sort((a, b) => b.revenue - a.revenue));

    // Alerts
    const alertsList: { type: string; message: string }[] = [];
    (vehicles || []).forEach(v => {
      if (v.insurance_expiry) {
        const days = Math.ceil((new Date(v.insurance_expiry).getTime() - Date.now()) / 86400000);
        if (days <= 30) alertsList.push({ type: days <= 7 ? "error" : "warning", message: t("admin.alertInsurance", { days, vehicle: `${v.model} (${v.plate_number})` }) });
      }
      if (v.technical_inspection_expiry) {
        const days = Math.ceil((new Date(v.technical_inspection_expiry).getTime() - Date.now()) / 86400000);
        if (days <= 30) alertsList.push({ type: days <= 7 ? "error" : "warning", message: t("admin.alertInspection", { days, vehicle: `${v.model} (${v.plate_number})` }) });
      }
      if (v.next_oil_change && v.mileage >= v.next_oil_change - 1000) {
        alertsList.push({ type: "warning", message: t("admin.alertOilChange", { vehicle: `${v.model} (${v.plate_number})`, km: v.next_oil_change - v.mileage }) });
      }
    });
    (drivers || []).forEach(d => {
      if (d.license_expiry) {
        const days = Math.ceil((new Date(d.license_expiry).getTime() - Date.now()) / 86400000);
        if (days <= 30) alertsList.push({ type: days <= 7 ? "error" : "warning", message: t("admin.alertLicense", { days, driver: `${d.first_name} ${d.last_name}` }) });
      }
    });
    setAlerts(alertsList);
    setLoading(false);
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t("admin.title")}</h1>
        <p className="text-muted-foreground">{t("admin.subtitle")}</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Card key={i} className={`border-l-4 ${a.type === "error" ? "border-l-destructive bg-destructive/5" : "border-l-yellow-500 bg-yellow-500/5"}`}>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className={`h-5 w-5 ${a.type === "error" ? "text-destructive" : "text-yellow-500"}`} />
                <p className="font-medium text-sm">{a.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.totalRevenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.revenue.toLocaleString()} CFA</div>
            <p className="text-xs text-muted-foreground">{t("admin.thisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.totalExpenses")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totals.expenses.toLocaleString()} CFA</div>
            <p className="text-xs text-muted-foreground">{t("admin.thisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.netProfit")}</CardTitle>
            <DollarSign className={`h-4 w-4 ${totals.profit >= 0 ? "text-accent" : "text-destructive"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.profit >= 0 ? "text-accent" : "text-destructive"}`}>{totals.profit.toLocaleString()} CFA</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.vehicleCount")}</CardTitle>
            <Car className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.vehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.driverCount")}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.drivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("admin.completedShifts")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totals.shifts}</div>
            <p className="text-xs text-muted-foreground">{t("admin.last3Months")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.revenueByVehicle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByVehicle.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByVehicle}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} CFA`} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name={t("admin.revenue")} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name={t("admin.expenses")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.profitByVehicle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicleStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={vehicleStats.filter(v => v.profit > 0)} dataKey="profit" nameKey="model" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                    {vehicleStats.filter(v => v.profit > 0).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} CFA`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t("admin.vehiclePerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("admin.vehicle")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.revenue")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.expenses")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.profit")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.shifts")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.km")}</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStats.map(v => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{v.model} <span className="text-muted-foreground">({v.plateNumber})</span></td>
                    <td className="text-right py-3 px-2 text-accent">{v.revenue.toLocaleString()} CFA</td>
                    <td className="text-right py-3 px-2 text-destructive">{v.expenses.toLocaleString()} CFA</td>
                    <td className={`text-right py-3 px-2 font-bold ${v.profit >= 0 ? "text-accent" : "text-destructive"}`}>{v.profit.toLocaleString()} CFA</td>
                    <td className="text-right py-3 px-2">{v.shifts}</td>
                    <td className="text-right py-3 px-2">{v.km.toLocaleString()}</td>
                    <td className="text-center py-3 px-2">
                      <Badge variant={v.profit > 0 ? "default" : "destructive"}>
                        {v.profit > 0 ? t("admin.profitable") : t("admin.loss")}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {vehicleStats.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">{t("common.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Driver Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("admin.driverPerformance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">{t("admin.driver")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.revenue")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.shifts")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.avgPerShift")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.km")}</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">{t("admin.fuelCost")}</th>
                </tr>
              </thead>
              <tbody>
                {driverStats.map(d => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium">{d.firstName} {d.lastName}</td>
                    <td className="text-right py-3 px-2 text-accent">{d.revenue.toLocaleString()} CFA</td>
                    <td className="text-right py-3 px-2">{d.shifts}</td>
                    <td className="text-right py-3 px-2">{d.avgPerShift.toLocaleString(undefined, { maximumFractionDigits: 0 })} CFA</td>
                    <td className="text-right py-3 px-2">{d.km.toLocaleString()}</td>
                    <td className="text-right py-3 px-2 text-destructive">{d.fuelCost.toLocaleString()} CFA</td>
                  </tr>
                ))}
                {driverStats.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">{t("common.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
