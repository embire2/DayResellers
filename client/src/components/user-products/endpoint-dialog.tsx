import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiSetting, UserProduct } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const endpointFormSchema = z.object({
  userProductId: z.number(),
  apiSettingId: z.number(),
  endpointPath: z.string().min(1, "Endpoint path is required"),
  customParameters: z.string().optional()
});

type EndpointFormData = z.infer<typeof endpointFormSchema>;

interface EndpointDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProduct: UserProduct;
  apiSettings: ApiSetting[];
}

export function EndpointDialog({ isOpen, onClose, userProduct, apiSettings }: EndpointDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EndpointFormData>({
    resolver: zodResolver(endpointFormSchema),
    defaultValues: {
      userProductId: userProduct?.id,
      apiSettingId: 0,
      endpointPath: "",
      customParameters: "{}"
    }
  });

  const addEndpointMutation = useMutation({
    mutationFn: (data: EndpointFormData) => {
      // Parse the JSON string to an object
      let parsedParams = {};
      try {
        if (data.customParameters) {
          parsedParams = JSON.parse(data.customParameters);
        }
      } catch (error) {
        throw new Error("Invalid JSON in custom parameters");
      }

      return apiRequest("POST", `/api/user-products/${userProduct.id}/endpoints`, {
        userProductId: data.userProductId,
        apiSettingId: data.apiSettingId,
        endpointPath: data.endpointPath,
        customParameters: parsedParams
      });
    },
    onSuccess: () => {
      toast({
        title: "Endpoint Added",
        description: "The endpoint has been added to the user product.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', 'product', userProduct.id] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add endpoint",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  function onSubmit(data: EndpointFormData) {
    addEndpointMutation.mutate(data);
  }

  // Get the selected API setting to show its endpoint pattern
  const selectedSetting = apiSettings.find(
    setting => setting.id === parseInt(form.watch("apiSettingId")?.toString() || "0")
  );

  return (
    <Dialog open={isOpen} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add API Endpoint</DialogTitle>
          <DialogDescription>
            Add a new API endpoint to this user product. Endpoints are used to execute API calls to the broadband.is API.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="apiSettingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Setting</FormLabel>
                  <Select 
                    onValueChange={value => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an API setting" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {apiSettings.map(setting => (
                        <SelectItem key={setting.id} value={setting.id.toString()}>
                          {setting.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endpointPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint Path</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={selectedSetting?.endpoint || "/path/to/endpoint"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                  {selectedSetting && (
                    <p className="text-sm text-gray-500">
                      Base endpoint: {selectedSetting.endpoint}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customParameters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Parameters (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{"param1": "value1", "param2": "value2"}' 
                      {...field} 
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">
                    Enter parameters as a JSON object. These will be sent with every request.
                  </p>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={addEndpointMutation.isPending}>
                {addEndpointMutation.isPending ? "Adding..." : "Add Endpoint"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}