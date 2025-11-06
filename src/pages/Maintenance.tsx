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

interface Maintenance {
  id: string;
  type: string;
  cost: number;
  date: string;
  status: string;
  notes?: string;
}

const Maintenance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    cost: "",
    date: format(new Date(), "yyyy-MM-dd"),
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchMaintenances();
  }, [user]);

  const fetchMaintenances = async () => {
    const { data, error } = await supabase
      .from("maintenance")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false });

    if (error) {
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

    if (editingMaintenance) {
      const { error } = await supabase
        .from("maintenance")
        .update({
          type: formData.type,
          cost: parseFloat(formData.cost),
          date: formData.date,
          status: formData.status,
          notes: formData.notes,
        })
        .eq("id", editingMaintenance.id);

      if (error) {
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
      const { error } = await supabase.from("maintenance").insert({
        user_id: user?.id,
        type: formData.type,
        cost: parseFloat(formData.cost),
        date: formData.date,
        status: formData.status,
        notes: formData.notes,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la maintenance",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Maintenance ajoutée avec succès",
        });
        fetchMaintenances();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("maintenance").delete().eq("id", id);

    if (error) {
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
  };

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setFormData({
      type: maintenance.type,
      cost: maintenance.cost.toString(),
      date: maintenance.date,
      status: maintenance.status,
      notes: maintenance.notes || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMaintenance(null);
    setFormData({
      type: "",
      cost: "",
      date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      notes: "",
    });
  };

  const totalCost = maintenances.reduce((sum, m) => sum + Number(m.cost), 0);
  const pendingCount = maintenances.filter((m) => m.status === "pending").length;
  const completedCount = maintenances.filter((m) => m.status === "completed").length;

  const statusColors = {
    pending: "bg-warning text-warning-foreground",
    completed: "bg-accent text-accent-foreground",
    scheduled: "bg-secondary text-secondary-foreground",
  };

  const statusLabels = {
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
            <Button onClick={() => setEditingMaintenance(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une maintenance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMaintenance ? "Modifier la maintenance" : "Nouvelle maintenance"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type de maintenance</Label>
                <Input
                  id="type"
                  placeholder="Ex: Changement des pneus"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Coût (€)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
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
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Détails ou remarques..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
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
            <div className="text-2xl font-bold text-foreground">{totalCost.toFixed(2)} €</div>
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
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune maintenance enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                maintenances.map((maintenance) => (
                  <TableRow key={maintenance.id}>
                    <TableCell>
                      {format(new Date(maintenance.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{maintenance.type}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[maintenance.status as keyof typeof statusColors]}>
                        {statusLabels[maintenance.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(maintenance.cost).toFixed(2)} €
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
                          onClick={() => handleDelete(maintenance.id)}
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
    </div>
  );
};

export default Maintenance;
