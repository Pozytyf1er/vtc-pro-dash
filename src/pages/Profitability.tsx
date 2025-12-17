import ProfitabilityDashboard from "@/components/ProfitabilityDashboard";

const Profitability = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Rentabilité</h1>
        <p className="text-muted-foreground">Analyse de la rentabilité de votre flotte</p>
      </div>
      <ProfitabilityDashboard />
    </div>
  );
};

export default Profitability;
