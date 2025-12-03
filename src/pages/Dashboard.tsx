import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, AlertTriangle, Filter } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpenseDetail {
  category: string;
  amount: number;
}

interface DetailData {
  title: string;
  period: string;
  revenue: number;
  expenses: ExpenseDetail[];
  totalExpenses: number;
  profit: number;
  expensePercentage: number;
}

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
  const [dailyReport, setDailyReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("7");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [allIncomes, setAllIncomes] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, filterPeriod]);

  const getStartDateForPeriod = (period: string): Date => {
    const today = new Date();
    switch (period) {
      case "7":
        return subDays(today, 7);
      case "14":
        return subDays(today, 14);
      case "30":
        return subDays(today, 30);
      case "90":
        return subMonths(today, 3);
      case "180":
        return subMonths(today, 6);
      case "365":
        return subMonths(today, 12);
      default:
        return subDays(today, 7);
    }
  };

  const fetchDashboardData = async () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { locale: fr });
    const monthStart = startOfMonth(today);
    const periodStart = getStartDateForPeriod(filterPeriod);

    // Fetch incomes for the selected period (use the earliest date needed)
    const earliestDate = periodStart < monthStart ? periodStart : monthStart;
    
    const { data: incomes } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user?.id)
      .gte("date", format(earliestDate, "yyyy-MM-dd"))
      .order("date", { ascending: false });

    // Fetch expenses for the selected period
    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user?.id)
      .gte("date", format(earliestDate, "yyyy-MM-dd"))
      .order("date", { ascending: false });

    // Fetch all vehicles for alerts
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user?.id);

    setAllIncomes(incomes || []);
    setAllExpenses(expenses || []);

    // Calculate stats
    const todayStr = format(today, "yyyy-MM-dd");
    const todayIncome = incomes?.filter(
      (i) => i.date === todayStr
    ).reduce((sum, i) => sum + Number(i.amount), 0) || 0;

    const weekIncome = incomes?.filter(
      (i) => new Date(i.date) >= weekStart
    ).reduce((sum, i) => sum + Number(i.amount), 0) || 0;

    const monthIncome = incomes?.filter(
      (i) => new Date(i.date) >= monthStart
    ).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
    
    const monthExpenses = expenses?.filter(
      (e) => new Date(e.date) >= monthStart
    ).reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    setStats({
      todayIncome,
      weekIncome,
      monthIncome,
      monthExpenses,
      netProfit: monthIncome - monthExpenses,
    });

    // Generate chart data based on selected period
    const periodIncomes = incomes?.filter(i => new Date(i.date) >= periodStart) || [];
    const periodExpenses = expenses?.filter(e => new Date(e.date) >= periodStart) || [];
    generateChartData(today, periodIncomes, periodExpenses, parseInt(filterPeriod));

    // Generate daily report for the selected period
    const dailyMap = new Map();
    periodIncomes.forEach((inc) => {
      if (!dailyMap.has(inc.date)) {
        dailyMap.set(inc.date, { date: inc.date, recettes: 0, dépenses: 0 });
      }
      dailyMap.get(inc.date).recettes += Number(inc.amount);
    });
    periodExpenses.forEach((exp) => {
      if (!dailyMap.has(exp.date)) {
        dailyMap.set(exp.date, { date: exp.date, recettes: 0, dépenses: 0 });
      }
      dailyMap.get(exp.date).dépenses += Number(exp.amount);
    });
    
    const dailyReportData = Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(day => ({
        ...day,
        net: day.recettes - day.dépenses,
      }));
    setDailyReport(dailyReportData);

    // Check alerts for all vehicles
    const alertsList: any[] = [];
    if (vehicles && vehicles.length > 0) {
      vehicles.forEach((vehicle) => {
        const todayDate = new Date();
        
        if (vehicle.next_oil_change && vehicle.mileage >= vehicle.next_oil_change - 1000) {
          alertsList.push({
            type: "warning",
            message: `Vidange proche pour ${vehicle.model} (${vehicle.plate_number}) : ${vehicle.next_oil_change - vehicle.mileage} km restants`,
          });
        }

        if (vehicle.insurance_expiry) {
          const insuranceDate = new Date(vehicle.insurance_expiry);
          const daysUntilExpiry = Math.ceil((insuranceDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30) {
            alertsList.push({
              type: daysUntilExpiry <= 7 ? "error" : "warning",
              message: `Assurance expire dans ${daysUntilExpiry} jours - ${vehicle.model}`,
            });
          }
        }

        if (vehicle.technical_inspection_expiry) {
          const inspectionDate = new Date(vehicle.technical_inspection_expiry);
          const daysUntilExpiry = Math.ceil((inspectionDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30) {
            alertsList.push({
              type: daysUntilExpiry <= 7 ? "error" : "warning",
              message: `Contrôle technique expire dans ${daysUntilExpiry} jours - ${vehicle.model}`,
            });
          }
        }
      });
    }
    setAlerts(alertsList);
    setLoading(false);
  };

  const generateChartData = (today: Date, incomes: any[], expenses: any[], days: number) => {
    const data = [];
    
    // For longer periods, aggregate by week or month
    if (days > 60) {
      // Aggregate by week for 3+ months
      const weeksCount = Math.ceil(days / 7);
      for (let i = weeksCount - 1; i >= 0; i--) {
        const weekEnd = subDays(today, i * 7);
        const weekStart = subDays(weekEnd, 6);
        
        const weekIncomes = incomes.filter((inc) => {
          const d = new Date(inc.date);
          return d >= weekStart && d <= weekEnd;
        }).reduce((sum, inc) => sum + Number(inc.amount), 0);
        
        const weekExpenses = expenses.filter((exp) => {
          const d = new Date(exp.date);
          return d >= weekStart && d <= weekEnd;
        }).reduce((sum, exp) => sum + Number(exp.amount), 0);
        
        data.push({
          date: format(weekStart, "dd MMM", { locale: fr }),
          recettes: weekIncomes,
          dépenses: weekExpenses,
        });
      }
    } else {
      // Daily for shorter periods
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dayIncomes = incomes.filter((inc) => inc.date === dateStr).reduce((sum, i) => sum + Number(i.amount), 0);
        const dayExpenses = expenses.filter((exp) => exp.date === dateStr).reduce((sum, e) => sum + Number(e.amount), 0);
        
        data.push({
          date: format(date, "dd MMM", { locale: fr }),
          recettes: dayIncomes,
          dépenses: dayExpenses,
        });
      }
    }
    setChartData(data);
  };

  const openDetailDialog = (type: 'today' | 'week' | 'month') => {
    const today = new Date();
    let title = '';
    let period = '';
    let filteredIncomes: any[] = [];
    let filteredExpenses: any[] = [];

    if (type === 'today') {
      const todayStr = format(today, "yyyy-MM-dd");
      title = "Détails du jour";
      period = format(today, "dd MMMM yyyy", { locale: fr });
      filteredIncomes = allIncomes.filter(i => i.date === todayStr);
      filteredExpenses = allExpenses.filter(e => e.date === todayStr);
    } else if (type === 'week') {
      const weekStart = startOfWeek(today, { locale: fr });
      title = "Détails de la semaine";
      period = `${format(weekStart, "dd MMM", { locale: fr })} - ${format(today, "dd MMM yyyy", { locale: fr })}`;
      filteredIncomes = allIncomes.filter(i => new Date(i.date) >= weekStart);
      filteredExpenses = allExpenses.filter(e => new Date(e.date) >= weekStart);
    } else {
      const monthStart = startOfMonth(today);
      title = "Détails du mois";
      period = format(today, "MMMM yyyy", { locale: fr });
      filteredIncomes = allIncomes.filter(i => new Date(i.date) >= monthStart);
      filteredExpenses = allExpenses.filter(e => new Date(e.date) >= monthStart);
    }

    const revenue = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
    
    // Group expenses by category
    const expensesByCategory = filteredExpenses.reduce((acc: Record<string, ExpenseDetail>, exp) => {
      const cat = exp.category || 'Autre';
      if (!acc[cat]) {
        acc[cat] = { category: cat, amount: 0 };
      }
      acc[cat].amount += Number(exp.amount);
      return acc;
    }, {});
    
    const expenseDetails: ExpenseDetail[] = Object.values(expensesByCategory);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const profit = revenue - totalExpenses;
    const expensePercentage = revenue > 0 ? (totalExpenses / revenue) * 100 : 0;

    setDetailData({
      title,
      period,
      revenue,
      expenses: expenseDetails,
      totalExpenses,
      profit,
      expensePercentage,
    });
    setDetailDialogOpen(true);
  };

  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case "7": return "7 derniers jours";
      case "14": return "14 derniers jours";
      case "30": return "30 derniers jours";
      case "90": return "3 derniers mois";
      case "180": return "6 derniers mois";
      case "365": return "Cette année";
      default: return "7 derniers jours";
    }
  };

  // Calculate period totals for display
  const periodStart = getStartDateForPeriod(filterPeriod);
  const periodIncomes = allIncomes.filter(i => new Date(i.date) >= periodStart);
  const periodExpenses = allExpenses.filter(e => new Date(e.date) >= periodStart);
  const periodTotalIncome = periodIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const periodTotalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

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

      {/* Stats Cards - Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-accent"
          onClick={() => openDetailDialog('today')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aujourd'hui
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.todayIncome.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">Cliquez pour voir les détails</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-accent"
          onClick={() => openDetailDialog('week')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cette semaine
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.weekIncome.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">Cliquez pour voir les détails</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-accent"
          onClick={() => openDetailDialog('month')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ce mois
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.monthIncome.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">Cliquez pour voir les détails</p>
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
              {stats.netProfit.toFixed(0)} CFA
            </div>
            <p className="text-xs text-muted-foreground">
              Dépenses: {stats.monthExpenses.toFixed(0)} CFA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detailData?.title}</DialogTitle>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center font-medium">
                {detailData.period}
              </p>

              {/* Revenue */}
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-accent">{detailData.revenue.toFixed(0)} CFA</p>
              </div>

              {/* Expenses by category */}
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground mb-3">Dépenses par catégorie</p>
                {detailData.expenses.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.expenses.map((exp, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm">{exp.category}</span>
                        <span className="font-medium text-destructive">{exp.amount.toFixed(0)} CFA</span>
                      </div>
                    ))}
                    <div className="border-t border-destructive/20 pt-2 mt-2">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total dépenses</span>
                        <span className="text-destructive">{detailData.totalExpenses.toFixed(0)} CFA</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune dépense</p>
                )}
              </div>

              {/* Expense percentage */}
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Ratio dépenses/CA</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${detailData.expensePercentage > 80 ? 'bg-destructive' : detailData.expensePercentage > 50 ? 'bg-warning' : 'bg-accent'}`}
                      style={{ width: `${Math.min(detailData.expensePercentage, 100)}%` }}
                    />
                  </div>
                  <span className="font-bold text-sm">{detailData.expensePercentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Profit */}
              <div className={`p-4 rounded-lg ${detailData.profit >= 0 ? 'bg-accent/10 border border-accent/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                <p className="text-sm text-muted-foreground">Bénéfice</p>
                <p className={`text-2xl font-bold ${detailData.profit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {detailData.profit >= 0 ? '+' : ''}{detailData.profit.toFixed(0)} CFA
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtre de période</CardTitle>
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="14">14 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">3 derniers mois</SelectItem>
              <SelectItem value="180">6 derniers mois</SelectItem>
              <SelectItem value="365">Cette année</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Period summary */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Résumé - {getPeriodLabel(filterPeriod)}
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-accent">{periodTotalIncome.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Recettes (CFA)</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{periodTotalExpenses.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Dépenses (CFA)</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${periodTotalIncome - periodTotalExpenses >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {(periodTotalIncome - periodTotalExpenses).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Bénéfice (CFA)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution - {getPeriodLabel(filterPeriod)}</CardTitle>
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

      {/* Daily Report */}
      <Card>
        <CardHeader>
          <CardTitle>Rapport détaillé - {getPeriodLabel(filterPeriod)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {dailyReport.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune donnée pour cette période
              </p>
            ) : (
              dailyReport.map((day) => (
                <div 
                  key={day.date} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    day.dépenses > day.recettes ? 'bg-destructive/5 border-destructive/20' : 'bg-accent/5 border-accent/20'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {format(new Date(day.date), "EEEE dd MMMM yyyy", { locale: fr })}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span className="text-accent">
                        Recettes: {day.recettes.toFixed(0)} CFA
                      </span>
                      <span className="text-destructive">
                        Dépenses: {day.dépenses.toFixed(0)} CFA
                      </span>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${day.net >= 0 ? 'text-accent' : 'text-destructive'}`}>
                    {day.net >= 0 ? '+' : ''}{day.net.toFixed(0)} CFA
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

export default Dashboard;
