import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Activity, Wifi, Clock, Database } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { UserProduct } from '@shared/schema';

interface UsageDataTabProps {
  userProduct: UserProduct;
}

interface UsageData {
  YM: string;
  Source: string;
  Year: string;
  MonthName: string;
  UserName: string;
  MSISDSN: string;
  ConnectedTime: string;
  Total: string;
  TotalGB: string;
}

interface DailyUsageData {
  Date: string;
  Total: string;
  TotalGB: string;
  ConnectedTime: string;
}

export function UsageDataTab({ userProduct }: UsageDataTabProps) {
  const [currentTab, setCurrentTab] = useState<string>('current');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  
  // Calculate the months for tabs (current month and 3 previous months)
  const currentDate = new Date();
  const currentMonth = format(currentDate, 'yyyy-MM');
  const prevMonth1 = format(subMonths(currentDate, 1), 'yyyy-MM');
  const prevMonth2 = format(subMonths(currentDate, 2), 'yyyy-MM');
  const prevMonth3 = format(subMonths(currentDate, 3), 'yyyy-MM');
  
  // Query for current month data
  const { data: currentMonthData, isLoading: isLoadingCurrent, error: currentError } = useQuery<any>({
    queryKey: ['/api/user-products', userProduct.id, 'usage', currentMonth],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user-products/${userProduct.id}/usage/${currentMonth}`);
      return response.json();
    },
    enabled: currentTab === 'current'
  });
  
  // Query for previous month data
  const { data: prevMonth1Data, isLoading: isLoadingPrev1, error: prev1Error } = useQuery<any>({
    queryKey: ['/api/user-products', userProduct.id, 'usage', prevMonth1],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user-products/${userProduct.id}/usage/${prevMonth1}`);
      return response.json();
    },
    enabled: currentTab === 'prev1'
  });
  
  // Query for 2 months ago data
  const { data: prevMonth2Data, isLoading: isLoadingPrev2, error: prev2Error } = useQuery<any>({
    queryKey: ['/api/user-products', userProduct.id, 'usage', prevMonth2],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user-products/${userProduct.id}/usage/${prevMonth2}`);
      return response.json();
    },
    enabled: currentTab === 'prev2'
  });
  
  // Query for 3 months ago data
  const { data: prevMonth3Data, isLoading: isLoadingPrev3, error: prev3Error } = useQuery<any>({
    queryKey: ['/api/user-products', userProduct.id, 'usage', prevMonth3],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/user-products/${userProduct.id}/usage/${prevMonth3}`);
      return response.json();
    },
    enabled: currentTab === 'prev3'
  });
  
  // Format month for display
  const formatMonthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, 'MMMM yyyy');
  };
  
  // Render the usage data content
  const renderUsageData = (data: any, isLoading: boolean, error: any, monthLabel: string) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-56">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading usage data for {monthLabel}...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error loading usage data</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to load usage data. Please try again later.'}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!data || !data.success) {
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>API Error</AlertTitle>
          <AlertDescription>
            {data?.error || 'Failed to fetch usage data from the API.'}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!data.data || !data.data.data || data.data.data.length === 0) {
      return (
        <div className="text-center p-8 border rounded-md bg-muted/20 text-muted-foreground">
          No usage data available for {monthLabel}.
        </div>
      );
    }
    
    const usageItems = data.data.data as UsageData[];
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {usageItems.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="text-lg flex items-center">
                <Wifi className="h-5 w-5 mr-2" />
                {item.UserName}
              </CardTitle>
              <CardDescription>
                Monthly Usage: {item.YM} ({monthLabel})
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-muted-foreground">
                    <Database className="h-4 w-4 mr-2" />
                    <span>Total Usage</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary font-mono">
                    {item.TotalGB} GB
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Connected Time</span>
                  </div>
                  <span className="font-mono">{item.ConnectedTime}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-muted-foreground">
                    <Activity className="h-4 w-4 mr-2" />
                    <span>Source</span>
                  </div>
                  <span>{item.Source}</span>
                </div>
                
                {item.MSISDSN && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-muted-foreground">
                      <span>MSISDN</span>
                    </div>
                    <span className="font-mono">{item.MSISDSN}</span>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => setSelectedMonth(selectedMonth === item.YM ? null : item.YM)}
                >
                  {selectedMonth === item.YM ? 'Hide Daily Breakdown' : 'Show Daily Breakdown'}
                </Button>
                
                {selectedMonth === item.YM && renderDailyData(data, item.YM)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderDailyData = (data: any, monthYM: string) => {
    if (!data || !data.success || !data.data || !data.data.dailyData || !data.data.dailyData[monthYM]) {
      return null;
    }

    const dailyItems = data.data.dailyData[monthYM];
    
    if (dailyItems.length === 0) {
      return (
        <div className="text-center p-4 text-muted-foreground">
          No daily breakdown available for this month.
        </div>
      );
    }
    
    return (
      <div className="mt-4">
        <h4 className="text-md font-medium mb-3 flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-primary" />
          Daily Usage Breakdown
        </h4>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Total Usage</th>
                <th className="text-left p-2">Connected Time</th>
              </tr>
            </thead>
            <tbody>
              {dailyItems.map((item: DailyUsageData, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="p-2">{item.Date}</td>
                  <td className="p-2 font-mono">{item.TotalGB} GB</td>
                  <td className="p-2 font-mono">{item.ConnectedTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <Calendar className="h-5 w-5 mr-2 text-primary" />
        <h3 className="text-lg font-medium">Monthly Usage Statistics</h3>
      </div>
      
      <Tabs defaultValue="current" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="current">
            {formatMonthLabel(currentMonth)}
          </TabsTrigger>
          <TabsTrigger value="prev1">
            {formatMonthLabel(prevMonth1)}
          </TabsTrigger>
          <TabsTrigger value="prev2">
            {formatMonthLabel(prevMonth2)}
          </TabsTrigger>
          <TabsTrigger value="prev3">
            {formatMonthLabel(prevMonth3)}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="pt-4">
          {renderUsageData(currentMonthData, isLoadingCurrent, currentError, formatMonthLabel(currentMonth))}
        </TabsContent>
        
        <TabsContent value="prev1" className="pt-4">
          {renderUsageData(prevMonth1Data, isLoadingPrev1, prev1Error, formatMonthLabel(prevMonth1))}
        </TabsContent>
        
        <TabsContent value="prev2" className="pt-4">
          {renderUsageData(prevMonth2Data, isLoadingPrev2, prev2Error, formatMonthLabel(prevMonth2))}
        </TabsContent>
        
        <TabsContent value="prev3" className="pt-4">
          {renderUsageData(prevMonth3Data, isLoadingPrev3, prev3Error, formatMonthLabel(prevMonth3))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
