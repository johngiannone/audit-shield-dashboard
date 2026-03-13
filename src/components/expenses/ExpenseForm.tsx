import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

import type { ExpenseInsert, ExpenseTransaction } from "@/hooks/useExpenseTransactions";

const CATEGORIES = [
  "Meals",
  "Travel",
  "Office Supplies",
  "Utilities",
  "Insurance",
  "Professional Services",
  "Marketing",
  "Income",
  "Personal",
  "Other",
] as const;

const schema = z.object({
  date: z.date({ required_error: "Date is required" }),
  description: z.string().trim().min(1, "Required").max(200, "Max 200 chars"),
  amount: z.coerce.number().positive("Must be > 0").max(99_999_999, "Amount too large"),
  category: z.string().min(1, "Pick a category"),
  is_deductible: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (tx: ExpenseInsert) => Promise<void>;
  onUpdate: (tx: ExpenseInsert & { id: string }) => Promise<void>;
  editingId: string | null;
  transactions: ExpenseTransaction[];
  onCancelEdit: () => void;
}

export function ExpenseForm({ onSubmit, onUpdate, editingId, transactions, onCancelEdit }: Props) {
  const isEditing = !!editingId;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date(), description: "", amount: 0, category: "", is_deductible: false },
  });

  // Populate form when editing
  useEffect(() => {
    if (editingId) {
      const tx = transactions.find((t) => t.id === editingId);
      if (tx) {
        form.reset({
          date: new Date(tx.date),
          description: tx.description,
          amount: Number(tx.amount),
          category: tx.category,
          is_deductible: tx.is_deductible,
        });
      }
    }
  }, [editingId, transactions, form]);

  const handleSubmit = async (values: FormValues) => {
    const payload: ExpenseInsert = {
      ...values,
      date: format(values.date, "yyyy-MM-dd"),
    };

    if (isEditing) {
      await onUpdate({ ...payload, id: editingId });
      onCancelEdit();
    } else {
      await onSubmit(payload);
    }
    form.reset({ date: new Date(), description: "", amount: 0, category: "", is_deductible: false });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl">
          {isEditing ? "Edit Expense" : "Add Expense"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(d) => d > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Client lunch" {...field} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deductible */}
            <FormField
              control={form.control}
              name="is_deductible"
              render={({ field }) => (
                <FormItem className="flex items-end gap-2 pb-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Deductible</FormLabel>
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {isEditing ? <><Save className="h-4 w-4 mr-1" /> Save</> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={() => { onCancelEdit(); form.reset(); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
