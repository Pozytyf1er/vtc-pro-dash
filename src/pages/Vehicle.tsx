import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
  mileage: number;
  next_oil_change?: number;
  insurance_expiry?: string;
  technical_inspection_expiry?: string;
}

const Vehicle = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    model: "",
    plate_number: "",
    mileage: "",
    next_oil_change: "",
    insurance_expiry: "",
    technical_inspection_expiry: "",
  });

  useEffect(() => {
    fetchVehicle();
  }, [user]);

  const fetchVehicle = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du véhicule",
        variant: "destructive",
      });
    } else if (data) {
      setVehicle(data);
      setFormData({
        model: data.model,
        plate_number: data.plate_number,
        mileage: data.mileage.toString(),
        next_oil_change: data.next_oil_change?.toString() || "",
        insurance_expiry: data.insurance_expiry || "",
        technical_inspection_expiry: data.technical_inspection_expiry || "",
      });
    } else {
      setEditing(true);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const vehicleData = {
      user_id: user?.id,
      model: formData.model,
      plate_number: formData.plate_number,
      mileage: parseInt(formData.mileage),
      next_oil_change: formData.next_oil_change ? parseInt(formData.next_oil_change) : null,
      insurance_expiry: formData.insurance_expiry || null,
      technical_inspection_expiry: formData.technical_inspection_expiry || null,
    };

    if (vehicle) {
      const { error } = await supabase
        .from("vehicles")
        .update(vehicleData)
        .eq("id", vehicle.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier le véhicule",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Véhicule modifié avec succès",
        });
        fetchVehicle();
        setEditing(false);
      }
    } else {
      const { error } = await supabase.from("vehicles").insert(vehicleData);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le véhicule",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Véhicule ajouté avec succès",
        });
        fetchVehicle();
        setEditing(false);
      }
    }
  };

  const getAlertStatus = (date?: string, km?: number) => {
    if (!date && !km) return null;

    if (km && vehicle) {
      const remaining = km - vehicle.mileage;
      if (remaining <= 1000) return "error";
      if (remaining <= 3000) return "warning";
      return "ok";
    }

    if (date) {
      const targetDate = new Date(date);
      const today = new Date();
      const daysRemaining = Math.ceil(
        (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining < 0) return "error";
      if (daysRemaining <= 7) return "error";
      if (daysRemaining <= 30) return "warning";
      return "ok";
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (editing || !vehicle) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mon véhicule</h1>
          <p className="text-muted-foreground">
            {vehicle ? "Modifier les informations" : "Ajouter votre véhicule"}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Modèle</Label>
                <Input
                  id="model"
                  placeholder="Ex: Tesla Model 3"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plate">Plaque d'immatriculation</Label>
                <Input
                  id="plate"
                  placeholder="Ex: AB-123-CD"
                  value={formData.plate_number}
                  onChange={(e) =>
                    setFormData({ ...formData, plate_number: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mileage">Kilométrage actuel</Label>
                <Input
                  id="mileage"
                  type="number"
                  placeholder="Ex: 50000"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oil">Prochain changement d'huile (km)</Label>
                <Input
                  id="oil"
                  type="number"
                  placeholder="Ex: 60000"
                  value={formData.next_oil_change}
                  onChange={(e) =>
                    setFormData({ ...formData, next_oil_change: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance">Date d'expiration de l'assurance</Label>
                <Input
                  id="insurance"
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) =>
                    setFormData({ ...formData, insurance_expiry: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspection">Date de la prochaine visite technique</Label>
                <Input
                  id="inspection"
                  type="date"
                  value={formData.technical_inspection_expiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      technical_inspection_expiry: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {vehicle ? "Modifier" : "Ajouter"}
                </Button>
                {vehicle && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mon véhicule</h1>
          <p className="text-muted-foreground">Informations et alertes</p>
        </div>
        <Button onClick={() => setEditing(true)}>Modifier</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modèle</span>
              <span className="font-medium">{vehicle.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Immatriculation</span>
              <span className="font-medium">{vehicle.plate_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kilométrage</span>
              <span className="font-medium">{vehicle.mileage.toLocaleString()} km</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance et contrôles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicle.next_oil_change && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vidange</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {vehicle.next_oil_change - vehicle.mileage} km restants
                  </span>
                  {getAlertStatus(undefined, vehicle.next_oil_change) === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {getAlertStatus(undefined, vehicle.next_oil_change) === "warning" && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {getAlertStatus(undefined, vehicle.next_oil_change) === "ok" && (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  )}
                </div>
              </div>
            )}

            {vehicle.insurance_expiry && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assurance</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {format(new Date(vehicle.insurance_expiry), "dd/MM/yyyy")}
                  </span>
                  {getAlertStatus(vehicle.insurance_expiry) === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {getAlertStatus(vehicle.insurance_expiry) === "warning" && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {getAlertStatus(vehicle.insurance_expiry) === "ok" && (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  )}
                </div>
              </div>
            )}

            {vehicle.technical_inspection_expiry && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contrôle technique</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {format(new Date(vehicle.technical_inspection_expiry), "dd/MM/yyyy")}
                  </span>
                  {getAlertStatus(vehicle.technical_inspection_expiry) === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {getAlertStatus(vehicle.technical_inspection_expiry) === "warning" && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {getAlertStatus(vehicle.technical_inspection_expiry) === "ok" && (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Vehicle;
