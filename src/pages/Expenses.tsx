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
import { Plus, Pencil, Trash2, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description?: string;
}

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "fuel",
    amount: "",
    description: "",
  });

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user?.id)
      .order("date", { ascending: false });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les dépenses",
        variant: "destructive",
      });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingExpense) {
      const { error } = await supabase
        .from("expenses")
        .update({
          date: formData.date,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
        })
        .eq("id", editingExpense.id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier la dépense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Dépense modifiée avec succès",
        });
        fetchExpenses();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase.from("expenses").insert({
        user_id: user?.id,
        date: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
      });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la dépense",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Succès",
          description: "Dépense ajoutée avec succès",
        });
        fetchExpenses();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Dépense supprimée avec succès",
      });
      fetchExpenses();
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      category: "fuel",
      amount: "",
      description: "",
    });
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    fuel: "Carburant",
    maintenance: "Entretien",
    insurance: "Assurance",
    parking: "Stationnement",
    tolls: "Péages",
    other: "Autre",
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
          <h1 className="text-3xl font-bold text-foreground">Dépenses</h1>
          <p className="text-muted-foreground">Gérez vos dépenses professionnelles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingExpense(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une dépense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Modifier la dépense" : "Nouvelle dépense"}
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
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuel">Carburant</SelectItem>
                    <SelectItem value="maintenance">Entretien</SelectItem>
                    <SelectItem value="insurance">Assurance</SelectItem>
                    <SelectItem value="parking">Stationnement</SelectItem>
                    <SelectItem value="tolls">Péages</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Input
                  id="description"
                  placeholder="Détails de la dépense"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingExpense ? "Modifier" : "Ajouter"}
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
              Total des dépenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalAmount.toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} dépenses enregistrées
            </p>
          </CardContent>
        </Card>

        {Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([category, amount]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[category]}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {amount.toFixed(2)} €
                </div>
                <p className="text-xs text-muted-foreground">
                  {((amount / totalAmount) * 100).toFixed(0)}% du total
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Aucune dépense enregistrée
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="capitalize">
                      {categoryLabels[expense.category]}
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {Number(expense.amount).toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
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

export default Expenses;
