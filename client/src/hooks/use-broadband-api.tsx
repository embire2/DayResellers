import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BroadbandApiResponse } from "@shared/types";
import { useToast } from "@/hooks/use-toast";

interface UseBroadbandApiOptions {
  masterCategory: 'MTN Fixed' | 'MTN GSM';
  endpoint: string;
  enabled?: boolean;
}

export function useBroadbandApi<T = any>({ masterCategory, endpoint, enabled = true }: UseBroadbandApiOptions) {
  const { toast } = useToast();
  
  // Query broadband API data
  const query = useQuery<BroadbandApiResponse, Error>({
    queryKey: ['/api/broadband', masterCategory, endpoint],
    enabled,
  });
  
  // Execute broadband API action
  const executeMutation = useMutation<BroadbandApiResponse, Error, any>({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/broadband/${masterCategory}/${endpoint}`, data);
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/broadband'] });
      
      if (data.success) {
        toast({
          title: "API request successful",
          description: "The operation was completed successfully.",
        });
      } else {
        toast({
          title: "API request returned an error",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "API request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return {
    data: query.data?.data as T,
    error: query.error || (query.data?.success === false ? new Error(query.data?.error) : undefined),
    isLoading: query.isLoading,
    isError: query.isError || (query.data?.success === false),
    execute: executeMutation.mutate,
    isExecuting: executeMutation.isPending,
  };
}
