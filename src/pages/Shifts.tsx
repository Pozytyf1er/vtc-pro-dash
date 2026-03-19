import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Play, Square, Car, Clock, Fuel, TrendingUp, MapPin, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Shift {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  start_mileage: number;
  end_mileage: number | null;
  total_revenue: number;
  fuel_cost: number;
  notes: string | null;
  status: string;
  vehicles?: { model: string; plate_number: string };
}

interface Vehicle {
  id: string;
  model: string;
  plate_number: string;
  mileage: number;
}

const Shifts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startMileage, setStartMileage] = useState("");
  const [endMileage, setEndMileage] = useState("");
  const [totalRevenue, setTotalRevenue] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [{ data: shiftsData }, { data: vehiclesData }] = await Promise.all([
      supabase
        .from("shifts")
        .select("*, vehicles(model, plate_number)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("vehicles").select("id, model, plate_number, mileage"),
    ]);

    setShifts(shiftsData || []);
    setVehicles(vehiclesData || []);

    // Check for active shift
    const active = (shiftsData || []).find((s) => s.status === "active");
    setActiveShift(active || null);

    setLoading(false);
  };

  const handleStartShift = async () => {
    if (!selectedVehicle || !startMileage) {
      toast({ title: "Erreur", description: "Véhicule et kilométrage requis", variant: "destructive" });
      return;
    }

    const mileage = parseInt(startMileage);
    if (isNaN(mileage) || mileage < 0) {
      toast({ title: "Erreur", description: "Kilométrage invalide", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.from("shifts").insert({
      user_id: user?.id,
      vehicle_id: selectedVehicle,
      start_mileage: mileage,
      status: "active",
    }).select("*, vehicles(model, plate_number)").single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de démarrer le shift", variant: "destructive" });
      return;
    }

    // Update vehicle mileage
    await supabase.from("vehicles").update({ mileage }).eq("id", selectedVehicle);

    setActiveShift(data);
    setShifts((prev) => [data, ...prev]);
    setStartDialogOpen(false);
    resetForm();
    toast({ title: "Shift démarré", description: "Bon travail !" });
  };

  const handleEndShift = async () => {
    if (!activeShift || !endMileage || !totalRevenue) {
      toast({ title: "Erreur", description: "Kilométrage final et recettes requis", variant: "destructive" });
      return;
    }

    const mileage = parseInt(endMileage);
    const revenue = parseFloat(totalRevenue);
    const fuel = parseFloat(fuelCost) || 0;

    if (isNaN(mileage) || mileage < activeShift.start_mileage) {
      toast({ title: "Erreur", description: "Kilométrage final doit être supérieur au départ", variant: "destructive" });
      return;
    }

    if (isNaN(revenue) || revenue < 0) {
      toast({ title: "Erreur", description: "Recettes invalides", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("shifts")
      .update({
        end_time: new Date().toISOString(),
        end_mileage: mileage,
        total_revenue: revenue,
        fuel_cost: fuel,
        notes: notes || null,
        status: "completed",
      })
      .eq("id", activeShift.id)
      .select("*, vehicles(model, plate_number)")
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de terminer le shift", variant: "destructive" });
      return;
    }

    // Update vehicle mileage
    await supabase.from("vehicles").update({ mileage }).eq("id", activeShift.vehicle_id);

    // Also create an income entry
    await supabase.from("incomes").insert({
      user_id: user?.id,
      amount: revenue,
      date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "Mixte",
      notes: `Shift - ${data.vehicles?.model || "Véhicule"}`,
    });

    // Create fuel expense if any
    if (fuel > 0) {
      await supabase.from("expenses").insert({
        user_id: user?.id,
        amount: fuel,
        date: format(new Date(), "yyyy-MM-dd"),
        category: "Carburant",
        description: `Carburant - Shift ${format(new Date(), "dd/MM/yyyy")}`,
      });
    }

    setActiveShift(null);
    setShifts((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    setEndDialogOpen(false);
    resetForm();
    toast({ title: "Shift terminé", description: `Recettes: ${revenue.toLocaleString()} CFA` });
  };

  const resetForm = () => {
    setSelectedVehicle("");
    setStartMileage("");
    setEndMileage("");
    setTotalRevenue("");
    setFuelCost("");
    setNotes("");
  };

  const openStartDialog = () => {
    resetForm();
    setStartDialogOpen(true);
  };

  const openEndDialog = () => {
    if (activeShift) {
      setEndMileage("");
      setTotalRevenue("");
      setFuelCost("");
      setNotes("");
      setEndDialogOpen(true);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setSelectedVehicle(shift.vehicle_id);
    setStartMileage(shift.start_mileage.toString());
    setEndMileage(shift.end_mileage?.toString() || "");
    setTotalRevenue(shift.total_revenue.toString());
    setFuelCost(shift.fuel_cost.toString());
    setNotes(shift.notes || "");
    setEditDialogOpen(true);
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;

    const mileageEnd = endMileage ? parseInt(endMileage) : null;
    const revenue = parseFloat(totalRevenue) || 0;
    const fuel = parseFloat(fuelCost) || 0;

    const { data, error } = await supabase
      .from("shifts")
      .update({
        start_mileage: parseInt(startMileage),
        end_mileage: mileageEnd,
        total_revenue: revenue,
        fuel_cost: fuel,
        notes: notes || null,
      })
      .eq("id", editingShift.id)
      .select("*, vehicles(model, plate_number)")
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le shift", variant: "destructive" });
      return;
    }

    setShifts((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    setEditDialogOpen(false);
    setEditingShift(null);
    resetForm();
    toast({ title: "Succès", description: "Shift modifié avec succès" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("shifts").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le shift", variant: "destructive" });
    } else {
      setShifts((prev) => prev.filter((s) => s.id !== deleteId));
      toast({ title: "Succès", description: "Shift supprimé avec succès" });
    }
    setDeleteId(null);
  };

  // Calculate today's stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShifts = shifts.filter(
    (s) => s.status === "completed" && s.end_time && format(new Date(s.end_time), "yyyy-MM-dd") === todayStr
  );
  const todayRevenue = todayShifts.reduce((sum, s) => sum + Number(s.total_revenue), 0);
  const todayKm = todayShifts.reduce((sum, s) => sum + ((s.end_mileage || 0) - s.start_mileage), 0);

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
        <h1 className="text-3xl font-bold text-foreground">Mes Shifts</h1>
        <p className="text-muted-foreground">Gérez vos courses quotidiennes</p>
      </div>

      {/* Active Shift Card */}
      {activeShift ? (
        <Card className="border-2 border-accent bg-accent/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
                <CardTitle className="text-lg">Shift en cours</CardTitle>
              </div>
              <Badge variant="default" className="bg-accent">
                <Clock className="mr-1 h-3 w-3" />
                {formatDistanceToNow(new Date(activeShift.start_time), { locale: fr, addSuffix: false })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{activeShift.vehicles?.model}</p>
                <p className="text-sm text-muted-foreground">{activeShift.vehicles?.plate_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Départ: {activeShift.start_mileage.toLocaleString()} km</span>
            </div>
            <Button onClick={openEndDialog} className="w-full bg-destructive hover:bg-destructive/90">
              <Square className="mr-2 h-4 w-4" />
              Terminer le shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun shift en cours</p>
            <Button onClick={openStartDialog} size="lg">
              <Play className="mr-2 h-5 w-5" />
              Démarrer un shift
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recettes aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold">{todayRevenue.toLocaleString()} CFA</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kilomètres parcourus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{todayKm.toLocaleString()} km</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des shifts</CardTitle>
          <CardDescription>Vos 10 derniers shifts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shifts
              .filter((s) => s.status === "completed")
              .slice(0, 10)
              .map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shift.vehicles?.model}</span>
                      <Badge variant="outline" className="text-xs">
                        {shift.vehicles?.plate_number}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{shift.end_time && format(new Date(shift.end_time), "dd MMM yyyy", { locale: fr })}</span>
                      <span>{((shift.end_mileage || 0) - shift.start_mileage).toLocaleString()} km</span>
                      {shift.fuel_cost > 0 && (
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" />
                          {Number(shift.fuel_cost).toLocaleString()} CFA
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-accent mr-2">
                      +{Number(shift.total_revenue).toLocaleString()} CFA
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(shift)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(shift.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            {shifts.filter((s) => s.status === "completed").length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun shift terminé</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start Shift Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Démarrer un shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Véhicule</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} - {v.plate_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kilométrage de départ</Label>
              <Input
                type="number"
                placeholder="Ex: 125000"
                value={startMileage}
                onChange={(e) => setStartMileage(e.target.value)}
              />
              {selectedVehicle && (
                <p className="text-xs text-muted-foreground">
                  Dernier kilométrage enregistré:{" "}
                  {vehicles.find((v) => v.id === selectedVehicle)?.mileage.toLocaleString()} km
                </p>
              )}
            </div>
            <Button onClick={handleStartShift} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Démarrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Shift Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer le shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kilométrage final *</Label>
              <Input
                type="number"
                placeholder="Ex: 125150"
                value={endMileage}
                onChange={(e) => setEndMileage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Kilométrage de départ: {activeShift?.start_mileage.toLocaleString()} km
              </p>
            </div>
            <div className="space-y-2">
              <Label>Recettes totales (CFA) *</Label>
              <Input
                type="number"
                placeholder="Ex: 45000"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Coût carburant (CFA)</Label>
              <Input
                type="number"
                placeholder="Ex: 15000"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes optionnelles..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleEndShift} className="w-full">
              <Square className="mr-2 h-4 w-4" />
              Terminer et enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kilométrage de départ</Label>
              <Input
                type="number"
                value={startMileage}
                onChange={(e) => setStartMileage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Kilométrage final</Label>
              <Input
                type="number"
                value={endMileage}
                onChange={(e) => setEndMileage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Recettes totales (CFA)</Label>
              <Input
                type="number"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Coût carburant (CFA)</Label>
              <Input
                type="number"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes optionnelles..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateShift} className="flex-1">
                Modifier
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEditDialogOpen(false); setEditingShift(null); }}
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Supprimer le shift"
        description="Êtes-vous sûr de vouloir supprimer ce shift ? Cette action est irréversible."
        onConfirm={handleDelete}
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Shifts;
