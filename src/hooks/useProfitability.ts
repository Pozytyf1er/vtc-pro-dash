import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { startOfMonth, subMonths, format } from "date-fns";

interface VehicleProfitability {
  id: string;
  model: string;
  plateNumber: string;
  totalRevenue: number;
  totalExpenses: number;
  maintenanceCosts: number;
  monthlyCosts: number;
  profit: number;
  profitMargin: number;
  mileage: number;
  costPerKm: number;
  status: "profitable" | "low" | "loss";
}

interface DriverPerformance {
  id: string;
  firstName: string;
  lastName: string;
  totalRevenue: number;
  shiftCount: number;
  avgRevenuePerShift: number;
  totalKm: number;
  performanceLevel: "excellent" | "average" | "poor";
  performancePercent: number;
}

interface ProfitabilitySummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  bestVehicle: VehicleProfitability | null;
  worstVehicle: VehicleProfitability | null;
  vehicles: VehicleProfitability[];
  drivers: DriverPerformance[];
  todayProfit: number;
  monthProfit: number;
}

export const useProfitability = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfitability = async () => {
    if (!user) return;

    const today = new Date();
    const monthStart = startOfMonth(today);
    const threeMonthsAgo = subMonths(today, 3);
    const todayStr = format(today, "yyyy-MM-dd");

    // Fetch all data in parallel
    const [
      { data: vehicles },
      { data: incomes },
      { data: expenses },
      { data: maintenance },
      { data: shifts },
      { data: drivers },
    ] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("incomes").select("*").gte("date", format(threeMonthsAgo, "yyyy-MM-dd")),
      supabase.from("expenses").select("*").gte("date", format(threeMonthsAgo, "yyyy-MM-dd")),
      supabase.from("maintenance").select("*").gte("date", format(threeMonthsAgo, "yyyy-MM-dd")),
      supabase.from("shifts").select("*").gte("created_at", threeMonthsAgo.toISOString()),
      supabase.from("drivers").select("*"),
    ]);

    // Calculate vehicle profitability
    const vehicleProfitability: VehicleProfitability[] = (vehicles || []).map((vehicle) => {
      // Revenue from shifts associated with this vehicle
      const vehicleShifts = (shifts || []).filter((s) => s.vehicle_id === vehicle.id);
      const totalRevenue = vehicleShifts.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
      
      // Expenses - try to match by description or use proportional
      const vehicleMaintenance = (maintenance || [])
        .filter((m) => m.vehicle_id === vehicle.id)
        .reduce((sum, m) => sum + Number(m.cost || 0), 0);
      
      // Monthly fixed costs (insurance + lease) * 3 months
      const monthlyCosts = (Number(vehicle.monthly_insurance_cost || 0) + Number(vehicle.monthly_lease_cost || 0)) * 3;
      
      // Fuel costs from shifts
      const fuelCosts = vehicleShifts.reduce((sum, s) => sum + Number(s.fuel_cost || 0), 0);
      
      const totalExpenses = vehicleMaintenance + monthlyCosts + fuelCosts;
      const profit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      
      // Calculate cost per km
      const totalKm = vehicleShifts.reduce((sum, s) => {
        const km = (s.end_mileage || 0) - (s.start_mileage || 0);
        return sum + Math.max(0, km);
      }, 0);
      const costPerKm = totalKm > 0 ? totalExpenses / totalKm : 0;

      // Determine status
      let status: "profitable" | "low" | "loss" = "profitable";
      if (profitMargin < 0) status = "loss";
      else if (profitMargin < 15) status = "low";

      return {
        id: vehicle.id,
        model: vehicle.model,
        plateNumber: vehicle.plate_number,
        totalRevenue,
        totalExpenses,
        maintenanceCosts: vehicleMaintenance,
        monthlyCosts,
        profit,
        profitMargin,
        mileage: vehicle.mileage,
        costPerKm,
        status,
      };
    });

    // Calculate driver performance
    const driverPerformance: DriverPerformance[] = (drivers || []).map((driver) => {
      const driverShifts = (shifts || []).filter((s) => s.driver_id === driver.id && s.status === "completed");
      const totalRevenue = driverShifts.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
      const shiftCount = driverShifts.length;
      const avgRevenuePerShift = shiftCount > 0 ? totalRevenue / shiftCount : 0;
      
      const totalKm = driverShifts.reduce((sum, s) => {
        const km = (s.end_mileage || 0) - (s.start_mileage || 0);
        return sum + Math.max(0, km);
      }, 0);

      // Performance calculation based on average revenue per shift
      // These thresholds can be adjusted based on business needs
      const avgTarget = 150000; // Target CFA per shift
      const performancePercent = Math.min(100, (avgRevenuePerShift / avgTarget) * 100);
      
      let performanceLevel: "excellent" | "average" | "poor" = "average";
      if (performancePercent >= 80) performanceLevel = "excellent";
      else if (performancePercent < 50) performanceLevel = "poor";

      return {
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        totalRevenue,
        shiftCount,
        avgRevenuePerShift,
        totalKm,
        performanceLevel,
        performancePercent,
      };
    });

    // Calculate totals
    const totalRevenue = vehicleProfitability.reduce((sum, v) => sum + v.totalRevenue, 0);
    const totalExpenses = vehicleProfitability.reduce((sum, v) => sum + v.totalExpenses, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Best and worst vehicles
    const sortedVehicles = [...vehicleProfitability].sort((a, b) => b.profit - a.profit);
    const bestVehicle = sortedVehicles[0] || null;
    const worstVehicle = sortedVehicles[sortedVehicles.length - 1] || null;

    // Today's profit
    const todayIncomes = (incomes || []).filter((i) => i.date === todayStr);
    const todayExpenses = (expenses || []).filter((e) => e.date === todayStr);
    const todayProfit = 
      todayIncomes.reduce((sum, i) => sum + Number(i.amount), 0) -
      todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // This month's profit
    const monthIncomes = (incomes || []).filter((i) => new Date(i.date) >= monthStart);
    const monthExpenses = (expenses || []).filter((e) => new Date(e.date) >= monthStart);
    const monthProfit =
      monthIncomes.reduce((sum, i) => sum + Number(i.amount), 0) -
      monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    setData({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      bestVehicle,
      worstVehicle,
      vehicles: vehicleProfitability,
      drivers: driverPerformance,
      todayProfit,
      monthProfit,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchProfitability();
  }, [user]);

  return { data, loading, refetch: fetchProfitability };
};
