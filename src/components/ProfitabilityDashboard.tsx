import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProfitability } from "@/hooks/useProfitability";
import {
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  DollarSign,
  AlertTriangle,
  Trophy,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ProfitabilityDashboard = () => {
  const { data, loading } = useProfitability();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "profitable":
        return "bg-accent text-accent-foreground";
      case "low":
        return "bg-warning text-warning-foreground";
      case "loss":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "profitable":
        return <TrendingUp className="h-4 w-4" />;
      case "low":
        return <AlertTriangle className="h-4 w-4" />;
      case "loss":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPerformanceColor = (level: string) => {
    switch (level) {
      case "excellent":
        return "bg-accent";
      case "average":
        return "bg-warning";
      case "poor":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const pieData = [
    { name: "Recettes", value: data.totalRevenue, color: "hsl(var(--accent))" },
    { name: "Dépenses", value: data.totalExpenses, color: "hsl(var(--destructive))" },
  ];

  const vehicleChartData = data.vehicles.map((v) => ({
    name: v.model.slice(0, 10),
    profit: v.profit,
    fill: v.status === "profitable" ? "hsl(var(--accent))" : v.status === "low" ? "hsl(var(--warning))" : "hsl(var(--destructive))",
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit du jour
            </CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.todayProfit >= 0 ? "text-accent" : "text-destructive"}`}>
              {data.todayProfit.toLocaleString()} CFA
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit ce mois
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.monthProfit >= 0 ? "text-accent" : "text-destructive"}`}>
              {data.monthProfit.toLocaleString()} CFA
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meilleur véhicule
            </CardTitle>
            <Trophy className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {data.bestVehicle?.model || "N/A"}
            </div>
            <p className="text-xs text-accent">
              +{(data.bestVehicle?.profit || 0).toLocaleString()} CFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Marge bénéficiaire
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.profitMargin >= 0 ? "text-accent" : "text-destructive"}`}>
              {data.profitMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue vs Expenses Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition financière</CardTitle>
            <CardDescription>Recettes vs Dépenses (3 derniers mois)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString()} CFA`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent" />
                <span className="text-sm">Recettes: {data.totalRevenue.toLocaleString()} CFA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm">Dépenses: {data.totalExpenses.toLocaleString()} CFA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Profitability Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rentabilité par véhicule</CardTitle>
            <CardDescription>Profit net (3 derniers mois)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString()} CFA`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="profit" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Rentabilité des véhicules
          </CardTitle>
          <CardDescription>Analyse détaillée par véhicule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{vehicle.model}</span>
                      <Badge variant="outline">{vehicle.plateNumber}</Badge>
                      <Badge className={getStatusColor(vehicle.status)}>
                        {getStatusIcon(vehicle.status)}
                        <span className="ml-1">
                          {vehicle.status === "profitable"
                            ? "Rentable"
                            : vehicle.status === "low"
                            ? "Faible"
                            : "Perte"}
                        </span>
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                      <span>Recettes: {vehicle.totalRevenue.toLocaleString()} CFA</span>
                      <span>Dépenses: {vehicle.totalExpenses.toLocaleString()} CFA</span>
                      <span>Coût/km: {vehicle.costPerKm.toFixed(0)} CFA</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${vehicle.profit >= 0 ? "text-accent" : "text-destructive"}`}>
                    {vehicle.profit >= 0 ? "+" : ""}{vehicle.profit.toLocaleString()} CFA
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Marge: {vehicle.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
            {data.vehicles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun véhicule enregistré
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Driver Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance des conducteurs
          </CardTitle>
          <CardDescription>Classement par revenus générés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.drivers
              .sort((a, b) => b.totalRevenue - a.totalRevenue)
              .map((driver, index) => (
                <div
                  key={driver.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{driver.shiftCount} shifts</span>
                        <span>{driver.totalKm.toLocaleString()} km</span>
                        <span>Moy: {driver.avgRevenuePerShift.toLocaleString()} CFA/shift</span>
                      </div>
                      <div className="mt-2 max-w-[200px]">
                        <Progress
                          value={driver.performancePercent}
                          className={`h-2 ${getPerformanceColor(driver.performanceLevel)}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-accent">
                      {driver.totalRevenue.toLocaleString()} CFA
                    </p>
                    <Badge
                      className={
                        driver.performanceLevel === "excellent"
                          ? "bg-accent text-accent-foreground"
                          : driver.performanceLevel === "average"
                          ? "bg-warning text-warning-foreground"
                          : "bg-destructive text-destructive-foreground"
                      }
                    >
                      {driver.performanceLevel === "excellent"
                        ? "Excellent"
                        : driver.performanceLevel === "average"
                        ? "Moyen"
                        : "À améliorer"}
                    </Badge>
                  </div>
                </div>
              ))}
            {data.drivers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun conducteur enregistré
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityDashboard;
