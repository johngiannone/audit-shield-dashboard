import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { ExpenseSummary } from "@/components/expenses/ExpenseSummary";
import { useExpenseTransactions } from "@/hooks/useExpenseTransactions";
import { Calculator } from "lucide-react";

const ExpenseCalculator = () => {
  const { transactions, isLoading, addTransaction, updateTransaction, deleteTransaction } = useExpenseTransactions();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Expense & Deduction Calculator
            </h1>
          </div>
          <p className="text-muted-foreground">
            Track your expenses and see which ones qualify as tax deductions.
          </p>
        </div>

        {/* Summary Cards */}
        <ExpenseSummary transactions={transactions} isLoading={isLoading} />

        {/* Add / Edit Form */}
        <ExpenseForm
          onSubmit={addTransaction}
          onUpdate={updateTransaction}
          editingId={editingId}
          transactions={transactions}
          onCancelEdit={() => setEditingId(null)}
        />

        {/* Transaction Table */}
        <ExpenseTable
          transactions={transactions}
          isLoading={isLoading}
          onEdit={setEditingId}
          onDelete={deleteTransaction}
        />
      </div>
    </DashboardLayout>
  );
};

export default ExpenseCalculator;
