import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ExpenseTransaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  is_deductible: boolean;
  created_at: string;
}

export type ExpenseInsert = Omit<ExpenseTransaction, "id" | "user_id" | "created_at">;

const QUERY_KEY = ["expense_transactions"];

export function useExpenseTransactions() {
  const qc = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ExpenseTransaction[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (tx: ExpenseInsert) => {
      const { error } = await supabase.from("expense_transactions").insert(tx);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Expense added");
    },
    onError: () => toast.error("Failed to add expense"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...tx }: ExpenseInsert & { id: string }) => {
      const { error } = await supabase
        .from("expense_transactions")
        .update(tx)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Expense updated");
    },
    onError: () => toast.error("Failed to update expense"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expense_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Expense deleted");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  return {
    transactions,
    isLoading,
    addTransaction: addMutation.mutateAsync,
    updateTransaction: updateMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
  };
}
