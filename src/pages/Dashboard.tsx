import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayIncome: 0,
    weekIncome: 0,
    monthIncome: 0,
    monthExpenses: 0,
    netProfit: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { locale: fr });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Fetch incomes
    const { data: incomes } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user?.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"));

    // Fetch expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user?.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"));

    // Fetch vehicle for alerts
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    // Calculate stats
    const todayIncome = incomes?.filter(
      (i) => i.date === format(today, "yyyy-MM-dd")
    ).reduce((sum, i) => sum + Number(i.amount), 0) || 0;

    const weekIncome = incomes?.filter(
      (i) => new Date(i.date) >= weekStart
    ).reduce((sum, i) => sum + Number(i.amount), 0) || 0;

    const monthIncome = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
    const monthExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    setStats({
      todayIncome,
      weekIncome,
      monthIncome,
      monthExpenses,
      netProfit: monthIncome - monthExpenses,
    });

    // Generate chart data for last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayIncomes = incomes?.filter((inc) => inc.date === dateStr).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const dayExpenses = expenses?.filter((exp) => exp.date === dateStr).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      chartData.push({
        date: format(date, "dd MMM", { locale: fr }),
        recettes: dayIncomes,
        dépenses: dayExpenses,
      });
    }
    setChartData(chartData);

    // Check alerts
    const alertsList = [];
    if (vehicle) {
      const today = new Date();
      
      if (vehicle.next_oil_change && vehicle.mileage >= vehicle.next_oil_change - 1000) {
        alertsList.push({
          type: "warning",
          message: `Vidange proche : ${vehicle.next_oil_change - vehicle.mileage} km restants`,
        });
      }

      if (vehicle.insurance_expiry) {
        const insuranceDate = new Date(vehicle.insurance_expiry);
        const daysUntilExpiry = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          alertsList.push({
            type: daysUntilExpiry <= 7 ? "error" : "warning",
            message: `Assurance expire dans ${daysUntilExpiry} jours`,
          });
        }
      }

      if (vehicle.technical_inspection_expiry) {
        const inspectionDate = new Date(vehicle.technical_inspection_expiry);
        const daysUntilExpiry = Math.ceil((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30) {
          alertsList.push({
            type: daysUntilExpiry <= 7 ? "error" : "warning",
            message: `Contrôle technique expire dans ${daysUntilExpiry} jours`,
          });
        }
      }
    }
    setAlerts(alertsList);
    setLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité VTC</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.type === "error" ? "border-l-destructive bg-destructive/5" : "border-l-warning bg-warning/5"
            }`}>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.type === "error" ? "text-destructive" : "text-warning"
                }`} />
                <p className="font-medium">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <div className="text-2xl font-bold text-foreground">{stats.todayIncome.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Recettes du jour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cette semaine
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.weekIncome.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Recettes hebdomadaires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ce mois
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.monthIncome.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">Recettes mensuelles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bénéfice net
            </CardTitle>
            <DollarSign className={`h-4 w-4 ${stats.netProfit >= 0 ? "text-accent" : "text-destructive"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-accent" : "text-destructive"}`}>
              {stats.netProfit.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              Dépenses: {stats.monthExpenses.toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="recettes" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Recettes"
                />
                <Line 
                  type="monotone" 
                  dataKey="dépenses" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Dépenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparaison recettes/dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="recettes" fill="hsl(var(--accent))" name="Recettes" />
                <Bar dataKey="dépenses" fill="hsl(var(--destructive))" name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
