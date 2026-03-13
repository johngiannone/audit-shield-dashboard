import { create } from 'zustand';

export interface AnalyzedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  is_deductible: boolean;
}

interface ExpenseStoreState {
  // Step: 1 = Upload, 2 = Processing, 3 = Results
  step: number;
  file: File | null;
  isAnalyzing: boolean;
  transactions: AnalyzedTransaction[];

  // Actions
  setStep: (step: number) => void;
  setFile: (file: File | null) => void;
  setIsAnalyzing: (value: boolean) => void;
  setTransactions: (transactions: AnalyzedTransaction[]) => void;
  updateTransactionCategory: (index: number, category: string, is_deductible: boolean) => void;
  reset: () => void;

  // Derived helpers
  getTotalIncome: () => number;
  getTotalExpenses: () => number;
  getTotalDeductions: () => number;
}

const initialState = {
  step: 1,
  file: null,
  isAnalyzing: false,
  transactions: [],
};

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setFile: (file) => set({ file }),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setTransactions: (transactions) => set({ transactions }),

  updateTransactionCategory: (index, category, is_deductible) =>
    set((state) => {
      const updated = [...state.transactions];
      if (updated[index]) {
        updated[index] = { ...updated[index], category, is_deductible };
      }
      return { transactions: updated };
    }),

  reset: () => set(initialState),

  getTotalIncome: () =>
    get().transactions
      .filter((t) => t.category === 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),

  getTotalExpenses: () =>
    get().transactions
      .filter((t) => t.category !== 'Income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),

  getTotalDeductions: () =>
    get().transactions
      .filter((t) => t.is_deductible)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
}));
