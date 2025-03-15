import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardDesigner as DashboardDesignerComponent } from "@/components/dashboard/dashboard-designer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { DashboardWidget } from "@shared/types";
import { Loader2 } from "lucide-react";

export default function DashboardDesigner() {
  const { toast } = useToast();
  const [selectedResellerId, setSelectedResellerId] = useState<string>("");
  
  // Fetch resellers
  const { data: resellers, isLoading: isLoadingResellers } = useQuery<User[]>({
    queryKey: ['/api/users'],
    select: (data) => data.filter(user => user.role === 'reseller'),
  });
  
  // Fetch dashboard configuration for selected reseller
  const { 
    data: dashboardConfig, 
    isLoading: isLoadingDashboardConfig,
    refetch: refetchDashboardConfig
  } = useQuery<{layouts: {desktop: DashboardWidget[]}}>({
    queryKey: ['/api/dashboards', selectedResellerId],
    enabled: !!selectedResellerId,
  });
  
  // Handle saving the dashboard configuration
  const saveDashboardMutation = useMutation({
    mutationFn: async (widgets: DashboardWidget[]) => {
      await apiRequest("POST", `/api/dashboards/${selectedResellerId}`, { widgets });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboards', selectedResellerId] });
      toast({
        title: "Dashboard saved",
        description: "The dashboard configuration has been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving dashboard",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResellerChange = (value: string) => {
    setSelectedResellerId(value);
  };

  const handleSaveDashboard = (widgets: DashboardWidget[]) => {
    if (!selectedResellerId) {
      toast({
        title: "No reseller selected",
        description: "Please select a reseller before saving the dashboard",
        variant: "destructive",
      });
      return;
    }
    
    saveDashboardMutation.mutate(widgets);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker">Dashboard Designer</h1>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Select Reseller</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
              <div>
                <Select
                  value={selectedResellerId}
                  onValueChange={handleResellerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reseller" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingResellers ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    ) : (
                      resellers?.map(reseller => (
                        <SelectItem key={reseller.id} value={reseller.id.toString()}>
                          {reseller.username}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => refetchDashboardConfig()} 
                  disabled={!selectedResellerId || isLoadingDashboardConfig}
                  variant="outline"
                >
                  {isLoadingDashboardConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Refresh Configuration'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {selectedResellerId && (
          <div className="mt-8">
            {isLoadingDashboardConfig ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <DashboardDesignerComponent
                widgets={dashboardConfig?.layouts.desktop || []}
                resellerId={parseInt(selectedResellerId)}
                onSave={handleSaveDashboard}
              />
            )}
          </div>
        )}
        
        {!selectedResellerId && (
          <div className="mt-8 bg-neutral-lighter p-6 rounded-lg text-center">
            <p className="text-neutral-dark">Please select a reseller to customize their dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
