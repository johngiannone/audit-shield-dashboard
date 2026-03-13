import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExpenseTransaction } from "@/hooks/useExpenseTransactions";

interface Props {
  transactions: ExpenseTransaction[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ExpenseTable({ transactions, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-xl">Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No expenses yet. Add your first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Deductible</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(tx.date + "T00:00:00"), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tx.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {tx.is_deductible ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(tx.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(tx.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
