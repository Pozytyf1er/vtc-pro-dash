import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Alert {
  id: string;
  type: "oil_change" | "insurance" | "inspection" | "license";
  title: string;
  message: string;
  severity: "warning" | "error";
  vehicleId?: string;
  driverId?: string;
  daysRemaining: number;
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
  mileage: number;
  next_oil_change?: number;
  insurance_expiry?: string;
  technical_inspection_expiry?: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_expiry?: string;
}

export const useAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    const alertsList: Alert[] = [];
    const today = new Date();

    // Fetch vehicles
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, model, plate_number, mileage, next_oil_change, insurance_expiry, technical_inspection_expiry");

    // Fetch drivers
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, first_name, last_name, license_expiry");

    // Check vehicle alerts
    (vehicles || []).forEach((vehicle: Vehicle) => {
      // Oil change alert (based on km)
      if (vehicle.next_oil_change) {
        const kmRemaining = vehicle.next_oil_change - vehicle.mileage;
        if (kmRemaining <= 1000) {
          alertsList.push({
            id: `oil-${vehicle.id}`,
            type: "oil_change",
            title: "Vidange urgente",
            message: `${vehicle.model} (${vehicle.plate_number}) - ${kmRemaining <= 0 ? "Dépassée" : `${kmRemaining} km restants`}`,
            severity: kmRemaining <= 0 ? "error" : "warning",
            vehicleId: vehicle.id,
            daysRemaining: kmRemaining,
          });
        }
      }

      // Insurance expiry
      if (vehicle.insurance_expiry) {
        const expiryDate = new Date(vehicle.insurance_expiry);
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          alertsList.push({
            id: `insurance-${vehicle.id}`,
            type: "insurance",
            title: daysRemaining <= 0 ? "Assurance expirée" : "Assurance bientôt expirée",
            message: `${vehicle.model} (${vehicle.plate_number}) - ${daysRemaining <= 0 ? "Expirée" : `${daysRemaining} jours restants`}`,
            severity: daysRemaining <= 7 ? "error" : "warning",
            vehicleId: vehicle.id,
            daysRemaining,
          });
        }
      }

      // Technical inspection
      if (vehicle.technical_inspection_expiry) {
        const expiryDate = new Date(vehicle.technical_inspection_expiry);
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          alertsList.push({
            id: `inspection-${vehicle.id}`,
            type: "inspection",
            title: daysRemaining <= 0 ? "Contrôle technique expiré" : "Contrôle technique bientôt",
            message: `${vehicle.model} (${vehicle.plate_number}) - ${daysRemaining <= 0 ? "Expiré" : `${daysRemaining} jours restants`}`,
            severity: daysRemaining <= 7 ? "error" : "warning",
            vehicleId: vehicle.id,
            daysRemaining,
          });
        }
      }
    });

    // Check driver license alerts
    (drivers || []).forEach((driver: Driver) => {
      if (driver.license_expiry) {
        const expiryDate = new Date(driver.license_expiry);
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          alertsList.push({
            id: `license-${driver.id}`,
            type: "license",
            title: daysRemaining <= 0 ? "Permis expiré" : "Permis bientôt expiré",
            message: `${driver.first_name} ${driver.last_name} - ${daysRemaining <= 0 ? "Expiré" : `${daysRemaining} jours restants`}`,
            severity: daysRemaining <= 7 ? "error" : "warning",
            driverId: driver.id,
            daysRemaining,
          });
        }
      }
    });

    // Sort by severity and days remaining
    alertsList.sort((a, b) => {
      if (a.severity === "error" && b.severity !== "error") return -1;
      if (a.severity !== "error" && b.severity === "error") return 1;
      return a.daysRemaining - b.daysRemaining;
    });

    setAlerts(alertsList);
    setLoading(false);
  };

  return { alerts, loading, refetch: fetchAlerts };
};
