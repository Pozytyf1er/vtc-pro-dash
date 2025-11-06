import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Income {
  id: string;
  date: string;
  route: string;
  distance: number;
  amount: number;
  payment_method: string;
  notes?: string;
}

const Incomes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    route: "",
    distance: "",
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    fetchIncomes();
  }, [user]);

  const fetchIncomes = async () => {
    const { data, error } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les recettes",
        variant: "destructive",
      });
    } else {
      setIncomes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingIncome) {
      const { error } = await supabase
        .from("incomes")
        .update({
          date: formData.date,
          route: formData.route,
          distance: parseFloat(formData.distance),
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          notes: formData.notes,
        })
        .eq("id", editingIncome.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier la recette",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Recette modifiée avec succès",
        });
        fetchIncomes();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("incomes").insert({
        user_id: user?.id,
        date: formData.date,
        route: formData.route,
        distance: parseFloat(formData.distance),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        notes: formData.notes,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la recette",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Recette ajoutée avec succès",
        });
        fetchIncomes();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("incomes").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recette",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Recette supprimée avec succès",
      });
      fetchIncomes();
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      date: income.date,
      route: income.route,
      distance: income.distance.toString(),
      amount: income.amount.toString(),
      payment_method: income.payment_method,
      notes: income.notes || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingIncome(null);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      route: "",
      distance: "",
      amount: "",
      payment_method: "cash",
      notes: "",
    });
  };

  const totalAmount = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const totalDistance = incomes.reduce((sum, income) => sum + Number(income.distance), 0);

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
          <h1 className="text-3xl font-bold text-foreground">Recettes</h1>
          <p className="text-muted-foreground">Gérez vos recettes de courses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingIncome(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une recette
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? "Modifier la recette" : "Nouvelle recette"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="route">Trajet</Label>
                <Input
                  id="route"
                  placeholder="Ex: Paris - CDG"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (€)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Moyen de paiement</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="app">Application</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Input
                  id="notes"
                  placeholder="Informations complémentaires"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingIncome ? "Modifier" : "Ajouter"}
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des recettes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{totalAmount.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">{incomes.length} courses enregistrées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distance totale
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDistance.toFixed(1)} km</div>
            <p className="text-xs text-muted-foreground">
              Moyenne: {incomes.length > 0 ? (totalAmount / incomes.length).toFixed(2) : "0.00"} € / course
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Trajet</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune recette enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{format(new Date(income.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{income.route}</TableCell>
                    <TableCell className="text-right">{income.distance} km</TableCell>
                    <TableCell className="text-right font-medium text-accent">
                      {Number(income.amount).toFixed(2)} €
                    </TableCell>
                    <TableCell className="capitalize">{income.payment_method}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(income)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(income.id)}
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

export default Incomes;
