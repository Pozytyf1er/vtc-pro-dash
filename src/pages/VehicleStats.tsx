import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, eachWeekOfInterval, format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Period = 'day' | 'week' | 'month';

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
}

interface ChartDataItem {
  label: string;
  revenue: number;
  recharge: number;
  fuel: number;
  maintenance: number;
  profit: number;
}

interface StatsData {
  totalRevenue: number;
  totalRecharge: number;
  totalFuel: number;
  totalMaintenance: number;
  ordersCount: number;
  chartData: ChartDataItem[];
}

const VehicleStats = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [period, setPeriod] = useState<Period>('day');
  const [stats, setStats] = useState<StatsData>({
    totalRevenue: 0,
    totalRecharge: 0,
    totalFuel: 0,
    totalMaintenance: 0,
    ordersCount: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicle();
      fetchStats();
    }
  }, [vehicleId, period]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, model, plate_number')
      .eq('id', vehicleId)
      .single();

    if (error) {
      toast.error("Erreur lors du chargement du véhicule");
      navigate('/vehicle');
    } else {
      setVehicle(data);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'day':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
    }

    return { start, end };
  };

  const fetchStats = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch incomes
      const { data: incomes, error: incomesError } = await supabase
        .from('incomes')
        .select('amount, date')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (incomesError) throw incomesError;

      // Fetch all expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, category, date')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('category', ['Recharge Yango', 'Carburant']);

      if (expensesError) throw expensesError;

      // Fetch maintenance for this vehicle
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance')
        .select('cost, date')
        .eq('vehicle_id', vehicleId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (maintenanceError) throw maintenanceError;

      let chartData: ChartDataItem[] = [];

      if (period === 'day') {
        // Show today's data
        const dayStr = format(start, 'yyyy-MM-dd');
        const revenue = incomes?.filter(i => i.date === dayStr).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
        const recharge = expenses?.filter(e => e.date === dayStr && e.category === 'Recharge Yango').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const fuel = expenses?.filter(e => e.date === dayStr && e.category === 'Carburant').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const maintenanceCost = maintenance?.filter(m => m.date === dayStr).reduce((sum, m) => sum + Number(m.cost), 0) || 0;

        chartData = [{
          label: format(start, 'dd MMM yyyy', { locale: fr }),
          revenue,
          recharge,
          fuel,
          maintenance: maintenanceCost,
          profit: revenue - recharge - fuel - maintenanceCost,
        }];
      } else if (period === 'week') {
        // Show 7 days of the week
        const days = eachDayOfInterval({ start, end });
        chartData = days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const revenue = incomes?.filter(i => i.date === dayStr).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
          const recharge = expenses?.filter(e => e.date === dayStr && e.category === 'Recharge Yango').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const fuel = expenses?.filter(e => e.date === dayStr && e.category === 'Carburant').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const maintenanceCost = maintenance?.filter(m => m.date === dayStr).reduce((sum, m) => sum + Number(m.cost), 0) || 0;

          return {
            label: format(day, 'dd MMM', { locale: fr }),
            revenue,
            recharge,
            fuel,
            maintenance: maintenanceCost,
            profit: revenue - recharge - fuel - maintenanceCost,
          };
        });
      } else {
        // Show weeks of the month
        const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        chartData = weeks.map((weekStart, index) => {
          const weekEnd = addDays(weekStart, 6);
          const weekEndCapped = weekEnd > end ? end : weekEnd;
          
          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(weekEndCapped, 'yyyy-MM-dd');

          const revenue = incomes?.filter(i => i.date >= weekStartStr && i.date <= weekEndStr).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
          const recharge = expenses?.filter(e => e.date >= weekStartStr && e.date <= weekEndStr && e.category === 'Recharge Yango').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const fuel = expenses?.filter(e => e.date >= weekStartStr && e.date <= weekEndStr && e.category === 'Carburant').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
          const maintenanceCost = maintenance?.filter(m => m.date >= weekStartStr && m.date <= weekEndStr).reduce((sum, m) => sum + Number(m.cost), 0) || 0;

          return {
            label: `S${index + 1}`,
            revenue,
            recharge,
            fuel,
            maintenance: maintenanceCost,
            profit: revenue - recharge - fuel - maintenanceCost,
          };
        });
      }

      const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
      const totalRecharge = chartData.reduce((sum, item) => sum + item.recharge, 0);
      const totalFuel = chartData.reduce((sum, item) => sum + item.fuel, 0);
      const totalMaintenance = chartData.reduce((sum, item) => sum + item.maintenance, 0);
      const ordersCount = incomes?.length || 0;

      setStats({
        totalRevenue,
        totalRecharge,
        totalFuel,
        totalMaintenance,
        ordersCount,
        chartData,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/vehicle')}
        className="mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={period === 'day' ? 'default' : 'outline'}
          onClick={() => setPeriod('day')}
        >
          Jour
        </Button>
        <Button
          variant={period === 'week' ? 'default' : 'outline'}
          onClick={() => setPeriod('week')}
        >
          Semaine
        </Button>
        <Button
          variant={period === 'month' ? 'default' : 'outline'}
          onClick={() => setPeriod('month')}
        >
          Mois
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold mb-3">{stats.totalRevenue.toLocaleString()} FCFA</h1>
            <p className="text-muted-foreground text-lg">{stats.ordersCount} commandes</p>
          </div>

          {stats.chartData.length > 0 && (
            <div className="h-64 mt-6 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} barSize={period === 'month' ? 50 : 40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {stats.chartData.map((item, index) => (
          <Card key={index} className="bg-card">
            <CardContent className="p-4">
              <div className="mb-3">
                <h3 className="font-semibold text-base mb-2">{item.label}</h3>
                <div className="text-2xl font-bold text-primary mb-1">
                  {item.revenue.toLocaleString()} FCFA
                </div>
                <p className="text-sm text-muted-foreground">Recette</p>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Commissions de service</span>
                  <span className="font-medium text-sm">-{item.recharge.toLocaleString()} FCFA</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Carburant</span>
                  <span className="font-medium text-sm">-{item.fuel.toLocaleString()} FCFA</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted-foreground">Maintenance</span>
                  <span className="font-medium text-sm">-{item.maintenance.toLocaleString()} FCFA</span>
                </div>

                <div className="flex justify-between items-center pt-2 mt-2 border-t">
                  <span className="font-semibold">Bénéfice</span>
                  <span className="font-bold text-lg text-primary">
                    {item.profit.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-primary/10 border-primary mt-4">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Bénéfice total</span>
              <span className="font-bold text-primary text-2xl">
                {(stats.totalRevenue - stats.totalRecharge - stats.totalFuel - stats.totalMaintenance).toLocaleString()} FCFA
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VehicleStats;
