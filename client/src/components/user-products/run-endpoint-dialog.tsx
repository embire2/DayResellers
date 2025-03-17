import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserProductEndpoint } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RunEndpointDialogProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: UserProductEndpoint;
  apiSettingName?: string;
}

export function RunEndpointDialog({ isOpen, onClose, endpoint, apiSettingName }: RunEndpointDialogProps) {
  const { toast } = useToast();
  const [params, setParams] = useState<string>(
    endpoint?.customParameters ? JSON.stringify(endpoint.customParameters, null, 2) : "{}"
  );
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const runEndpointMutation = useMutation({
    mutationFn: async () => {
      setResult("");
      setError("");
      
      // Parse the JSON parameters
      let parsedParams = {};
      try {
        if (params && params.trim() !== "") {
          parsedParams = JSON.parse(params);
        }
      } catch (error) {
        throw new Error("Invalid JSON in parameters");
      }

      const response = await apiRequest("POST", `/api/run-endpoint/${endpoint.id}`, {
        params: parsedParams
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Failed to run endpoint",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  function handleRunEndpoint() {
    runEndpointMutation.mutate();
  }

  return (
    <Dialog open={isOpen} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Run API Endpoint</DialogTitle>
          <DialogDescription>
            {apiSettingName ? `${apiSettingName} - ` : ""}{endpoint?.endpointPath}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="params">Parameters (JSON)</Label>
            <Textarea
              id="params"
              placeholder='{"param1": "value1", "param2": "value2"}'
              value={params}
              onChange={(e) => setParams(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Enter parameters as a JSON object. Default parameters are already included.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="font-mono text-sm whitespace-pre-wrap break-all">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="grid gap-2">
              <Label htmlFor="result">Result</Label>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <pre className="text-sm overflow-auto max-h-[300px] font-mono whitespace-pre-wrap break-all">
                  {result}
                </pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleRunEndpoint} disabled={runEndpointMutation.isPending}>
            {runEndpointMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              "Run Endpoint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}