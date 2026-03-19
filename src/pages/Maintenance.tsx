import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ConfirmDialog from "@/components/ConfirmDialog";
import { maintenanceSchema, getValidationErrors, devLog } from "@/lib/validations";

interface Maintenance {
  id: string;
  type: string;
  cost: number;
  date: string;
  status: string;
  notes?: string;
  vehicle_id?: string;
  last_oil_change_km?: number;
  oil_change_interval?: number;
  next_oil_change_km?: number;
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
  mileage: number;
}

const Maintenance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    cost: "",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "pending",
    notes: "",
    vehicle_id: "",
    last_oil_change_km: "",
    oil_change_interval: "5000",
  });

  useEffect(() => {
    fetchVehicles();
    fetchMaintenances();
  }, [user]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      devLog.error('Error fetching vehicles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les véhicules",
        variant: "destructive",
      });
    } else {
      setVehicles(data || []);
    }
  };

  const fetchMaintenances = async () => {
    const { data, error } = await supabase
      .from("maintenance")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false });

    if (error) {
      devLog.error('Error fetching maintenances:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les maintenances",
        variant: "destructive",
      });
    } else {
      setMaintenances(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validation = maintenanceSchema.safeParse(formData);
    if (!validation.success) {
      setErrors(getValidationErrors(validation));
      return;
    }

    const last_oil_km = formData.last_oil_change_km ? parseInt(formData.last_oil_change_km) : null;
    const interval = formData.oil_change_interval ? parseInt(formData.oil_change_interval) : null;
    const next_oil_km = last_oil_km && interval ? last_oil_km + interval : null;

    if (editingMaintenance) {
      const { error } = await supabase
        .from("maintenance")
        .update({
          type: formData.type,
          cost: parseFloat(formData.cost),
          date: formData.date,
          status: formData.status,
          notes: formData.notes,
          vehicle_id: formData.vehicle_id || null,
          last_oil_change_km: last_oil_km,
          oil_change_interval: interval,
          next_oil_change_km: next_oil_km,
        })
        .eq("id", editingMaintenance.id);

      if (error) {
        devLog.error('Error updating maintenance:', error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier la maintenance",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Maintenance modifiée avec succès",
        });
        fetchMaintenances();
        handleCloseDialog();
      }
    } else {
      const { data: maintenanceData, error } = await supabase.from("maintenance").insert({
        user_id: user?.id,
        type: formData.type,
        cost: parseFloat(formData.cost),
        date: formData.date,
        status: formData.status,
        notes: formData.notes,
        vehicle_id: formData.vehicle_id || null,
        last_oil_change_km: last_oil_km,
        oil_change_interval: interval,
        next_oil_change_km: next_oil_km,
      }).select();

      if (error) {
        devLog.error('Error creating maintenance:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la maintenance",
          variant: "destructive",
        });
      } else {
        // Auto-add to expenses with correct lowercase category
        const cost = parseFloat(formData.cost);
        if (cost > 0) {
          const { error: expenseError } = await supabase.from("expenses").insert({
            user_id: user?.id,
            amount: cost,
            category: "maintenance", // Fixed: lowercase to match category system
            date: formData.date,
            description: `Maintenance: ${formData.type}`,
          });
          
          if (expenseError) {
            devLog.error('Error creating expense from maintenance:', expenseError);
          }
        }
        
        toast({
          title: "Succès",
          description: "Maintenance ajoutée avec succès (dépense créée automatiquement)",
        });
        fetchMaintenances();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase.from("maintenance").delete().eq("id", deleteId);

    if (error) {
      devLog.error('Error deleting maintenance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la maintenance",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Maintenance supprimée avec succès",
      });
      fetchMaintenances();
    }
    setDeleteId(null);
  };

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData({
      type: maintenance.type,
      cost: maintenance.cost.toString(),
      date: maintenance.date,
      status: maintenance.status,
      notes: maintenance.notes || "",
      vehicle_id: maintenance.vehicle_id || "",
      last_oil_change_km: maintenance.last_oil_change_km?.toString() || "",
      oil_change_interval: maintenance.oil_change_interval?.toString() || "5000",
    });
    setErrors([]);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMaintenance(null);
    setErrors([]);
    setFormData({
      type: "",
      cost: "",
      date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      notes: "",
      vehicle_id: "",
      last_oil_change_km: "",
      oil_change_interval: "5000",
    });
  };

  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return "-";
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : "-";
  };

  const totalCost = maintenances.reduce((sum, m) => sum + Number(m.cost), 0);
  const pendingCount = maintenances.filter((m) => m.status === "pending").length;
  const completedCount = maintenances.filter((m) => m.status === "completed").length;

  const statusColors: Record<string, string> = {
    pending: "bg-warning text-warning-foreground",
    completed: "bg-accent text-accent-foreground",
    scheduled: "bg-secondary text-secondary-foreground",
  };

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    completed: "Terminée",
    scheduled: "Planifiée",
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
          <h1 className="text-3xl font-bold text-foreground">Maintenance</h1>
          <p className="text-muted-foreground">Suivi des opérations de maintenance</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMaintenance(null); setErrors([]); }}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenance ? "Modifier la maintenance" : "Nouvelle maintenance"}
              </DialogTitle>
            </DialogHeader>
            {errors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <ul className="list-inside list-disc space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type de maintenance</Label>
                <Input
                  id="type"
                  placeholder="Ex: Changement des pneus"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Coût (CFA)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="scheduled">Planifiée</SelectItem>
                    <SelectItem value="completed">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle">Véhicule (optionnel)</Label>
                <Select
                  value={formData.vehicle_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, vehicle_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun véhicule</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} - {vehicle.plate_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type.toLowerCase().includes("vidange") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="lastOilKm">Kilométrage de la dernière vidange</Label>
                    <Input
                      id="lastOilKm"
                      type="number"
                      placeholder="Ex: 45000"
                      value={formData.last_oil_change_km}
                      onChange={(e) =>
                        setFormData({ ...formData, last_oil_change_km: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interval">Intervalle de vidange (km)</Label>
                    <Select
                      value={formData.oil_change_interval}
                      onValueChange={(value) =>
                        setFormData({ ...formData, oil_change_interval: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5000">5 000 km</SelectItem>
                        <SelectItem value="10000">10 000 km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.last_oil_change_km && formData.oil_change_interval && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm text-muted-foreground">
                        Prochaine vidange prévue à :{" "}
                        <span className="font-medium text-foreground">
                          {(
                            parseInt(formData.last_oil_change_km) +
                            parseInt(formData.oil_change_interval)
                          ).toLocaleString()}{" "}
                          km
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Détails ou remarques..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingMaintenance ? "Modifier" : "Ajouter"}
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coût total
            </CardTitle>
            <Wrench className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCost.toFixed(0)} CFA</div>
            <p className="text-xs text-muted-foreground">
              {maintenances.length} opérations au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
            <Wrench className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Opérations à effectuer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Terminées
            </CardTitle>
            <Wrench className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Opérations effectuées</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune maintenance enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                maintenances.map((maintenance) => (
                  <TableRow key={maintenance.id}>
                    <TableCell>{format(new Date(maintenance.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{maintenance.type}</TableCell>
                    <TableCell>{getVehicleName(maintenance.vehicle_id)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[maintenance.status]}>
                        {statusLabels[maintenance.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(maintenance.cost).toFixed(0)} CFA
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(maintenance)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(maintenance.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer la maintenance"
        description="Êtes-vous sûr de vouloir supprimer cette maintenance ? Cette action est irréversible."
        onConfirm={handleDelete}
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Maintenance;
