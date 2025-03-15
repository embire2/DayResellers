import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Transaction } from "@shared/schema";
import { Download, Loader2 } from "lucide-react";

export default function Billing() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  
  // Fetch transaction history
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Get billing periods (last 6 months)
  const getBillingPeriods = () => {
    const periods = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      
      periods.push({
        value: `${year}-${date.getMonth() + 1}`,
        label: `${month} ${year}`,
        current: i === 0
      });
    }
    
    return periods;
  };
  
  const billingPeriods = getBillingPeriods();
  
  // Filter transactions based on selected period
  const filterTransactionsByPeriod = (transactions: Transaction[]) => {
    if (!transactions) return [];
    
    if (selectedPeriod === "current-month") {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        return transactionDate.getFullYear() === currentYear && 
               transactionDate.getMonth() === currentMonth;
      });
    } else if (selectedPeriod === "all-time") {
      return transactions;
    } else {
      const [year, month] = selectedPeriod.split('-').map(Number);
      
      return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        return transactionDate.getFullYear() === year && 
               transactionDate.getMonth() === month - 1;
      });
    }
  };
  
  const filteredTransactions = transactions ? filterTransactionsByPeriod(transactions) : [];
  
  // Calculate billing summary
  const calculateBillingSummary = (transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) {
      return {
        totalSpent: 0,
        totalCredits: 0,
        balance: user?.creditBalance ? parseFloat(user.creditBalance.toString()) : 0
      };
    }
    
    let totalSpent = 0;
    let totalCredits = 0;
    
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount.toString());
      
      if (transaction.type === 'debit') {
        totalSpent += amount;
      } else if (transaction.type === 'credit') {
        totalCredits += amount;
      }
    });
    
    return {
      totalSpent,
      totalCredits,
      balance: user?.creditBalance ? parseFloat(user.creditBalance.toString()) : 0
    };
  };
  
  const billingSummary = calculateBillingSummary(filteredTransactions);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">Billing</h1>

        {/* Billing Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(billingSummary.balance)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Spent</CardTitle>
              <CardDescription>In selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-neutral-darker">
                {formatCurrency(billingSummary.totalSpent)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Credits Added</CardTitle>
              <CardDescription>In selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(billingSummary.totalCredits)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View your billing transactions</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedPeriod} 
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  {billingPeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {filteredTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction, index) => (
                        <TableRow key={transaction.id || index}>
                          <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.type === 'credit' ? (
                              <Badge variant="outline" className="bg-success bg-opacity-10 text-success">
                                Credit
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary">
                                Debit
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={transaction.type === 'credit' ? 'text-success' : ''}>
                              {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(parseFloat(transaction.amount.toString()))}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-neutral-dark">No transactions found for the selected period</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
