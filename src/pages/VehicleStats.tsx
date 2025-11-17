import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Period = 'day' | 'week' | 'month';

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
}

interface StatsData {
  totalRevenue: number;
  totalRecharge: number;
  totalFuel: number;
  totalMaintenance: number;
  ordersCount: number;
  chartData: Array<{ date: string; dateLabel?: string; amount: number }>;
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

      // Fetch all expenses (not filtered by vehicle)
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

      // Calculate totals
      const totalRevenue = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const totalRecharge = expenses?.filter(e => e.category === 'Recharge Yango').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalFuel = expenses?.filter(e => e.category === 'Carburant').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalMaintenance = maintenance?.reduce((sum, m) => sum + Number(m.cost), 0) || 0;

      // Generate chart data
      const days = eachDayOfInterval({ start, end });
      const chartData = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayRevenue = incomes?.filter(i => i.date === dayStr).reduce((sum, i) => sum + Number(i.amount), 0) || 0;
        
        return {
          date: format(day, period === 'day' ? 'HH:mm' : 'dd', { locale: fr }),
          dateLabel: format(day, 'dd MMM', { locale: fr }),
          amount: dayRevenue,
        };
      });

      setStats({
        totalRevenue,
        totalRecharge,
        totalFuel,
        totalMaintenance,
        ordersCount: incomes?.length || 0,
        chartData,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !vehicle) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

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
            <h1 className="text-6xl font-bold mb-3">{stats.totalRevenue.toLocaleString()} FCFA</h1>
            <p className="text-muted-foreground text-xl">{stats.ordersCount} commandes</p>
          </div>

          {stats.chartData.length > 0 && (
            <div className="h-72 mt-8 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} barSize={period === 'week' ? 40 : 30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey={period === 'week' ? 'date' : 'dateLabel'} 
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
                    dataKey="amount" 
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
        <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-base">Espèces</span>
            <span className="font-semibold text-lg">{stats.totalRevenue.toLocaleString()} FCFA</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-base">Commissions de service</span>
            <span className="font-semibold text-lg">-{stats.totalRecharge.toLocaleString()} FCFA</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-base">Carburant</span>
            <span className="font-semibold text-lg">-{stats.totalFuel.toLocaleString()} FCFA</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-base">Maintenance</span>
            <span className="font-semibold text-lg">-{stats.totalMaintenance.toLocaleString()} FCFA</span>
          </div>
        </div>

        <Card className="bg-primary/10 border-primary mt-4">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Bénéfice net</span>
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
