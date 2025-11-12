import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, AlertCircle, CheckCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
  mileage: number;
  next_oil_change?: number;
  insurance_expiry?: string;
  technical_inspection_expiry?: string;
  assigned_driver_id?: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
}

const Vehicle = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    model: "",
    plate_number: "",
    mileage: "",
    next_oil_change: "",
    insurance_expiry: "",
    technical_inspection_expiry: "",
    assigned_driver_id: "",
  });

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, [user]);

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("id, first_name, last_name")
      .eq("user_id", user?.id)
      .order("first_name", { ascending: true });

    if (!error) {
      setDrivers(data || []);
    }
  };

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les véhicules",
        variant: "destructive",
      });
    } else {
      setVehicles(data || []);
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
      assigned_driver_id: formData.assigned_driver_id || null,
    };

    if (editingVehicle) {
      const { error } = await supabase
        .from("vehicles")
        .update(vehicleData)
        .eq("id", editingVehicle.id);

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
        fetchVehicles();
        handleCloseDialog();
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
        fetchVehicles();
        handleCloseDialog();
      }
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      model: vehicle.model,
      plate_number: vehicle.plate_number,
      mileage: vehicle.mileage.toString(),
      next_oil_change: vehicle.next_oil_change?.toString() || "",
      insurance_expiry: vehicle.insurance_expiry || "",
      technical_inspection_expiry: vehicle.technical_inspection_expiry || "",
      assigned_driver_id: vehicle.assigned_driver_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le véhicule",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Véhicule supprimé avec succès",
      });
      fetchVehicles();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVehicle(null);
    setFormData({
      model: "",
      plate_number: "",
      mileage: "",
      next_oil_change: "",
      insurance_expiry: "",
      technical_inspection_expiry: "",
      assigned_driver_id: "",
    });
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Non assigné";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Non assigné";
  };

  const getAlertStatus = (date?: string, km?: number, vehicleMileage?: number) => {
    if (!date && !km) return null;

    if (km && vehicleMileage !== undefined) {
      const remaining = km - vehicleMileage;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes véhicules</h1>
          <p className="text-muted-foreground">Gestion de votre flotte</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingVehicle(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un véhicule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? "Modifier le véhicule" : "Nouveau véhicule"}
              </DialogTitle>
            </DialogHeader>
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
                <Label htmlFor="driver">Conducteur assigné</Label>
                <Select
                  value={formData.assigned_driver_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assigned_driver_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un conducteur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun conducteur</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {editingVehicle ? "Modifier" : "Ajouter"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun véhicule enregistré. Cliquez sur "Ajouter un véhicule" pour commencer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    <CardTitle>{vehicle.model}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Immatriculation</span>
                    <span className="font-medium">{vehicle.plate_number}</span>
                  </div>
                  {vehicle.assigned_driver_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conducteur</span>
                      <span className="font-medium">{getDriverName(vehicle.assigned_driver_id)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kilométrage</span>
                    <span className="font-medium">{vehicle.mileage.toLocaleString()} km</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  {vehicle.next_oil_change && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Vidange</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {vehicle.next_oil_change - vehicle.mileage} km restants
                        </span>
                        {getAlertStatus(undefined, vehicle.next_oil_change, vehicle.mileage) === "error" && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        {getAlertStatus(undefined, vehicle.next_oil_change, vehicle.mileage) === "warning" && (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        {getAlertStatus(undefined, vehicle.next_oil_change, vehicle.mileage) === "ok" && (
                          <CheckCircle className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    </div>
                  )}

                  {vehicle.insurance_expiry && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assurance</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
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
                      <span className="text-sm text-muted-foreground">Contrôle technique</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vehicle;