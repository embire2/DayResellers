import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ApiSetting } from "@shared/schema";
import { Plus, Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// API Setting form schema
const apiSettingSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  endpoint: z.string().min(1, "Endpoint is required"),
  masterCategory: z.enum(["MTN Fixed", "MTN GSM"]),
  isEnabled: z.boolean().default(true).optional(),
});

export default function ApiIntegration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'MTN Fixed' | 'MTN GSM'>('MTN Fixed');
  const [isApiSettingModalOpen, setIsApiSettingModalOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch API settings
  const { data: apiSettingsResponse, isLoading: isLoadingApiSettings } = useQuery<{ success: boolean, data: ApiSetting[] }>({
    queryKey: ['/api/broadband/endpoints', activeTab],
  });
  
  // Extract the array of settings from the response
  const apiSettings = apiSettingsResponse?.data || [];

  // API setting form
  const form = useForm<z.infer<typeof apiSettingSchema>>({
    resolver: zodResolver(apiSettingSchema),
    defaultValues: {
      name: "",
      endpoint: "",
      masterCategory: activeTab,
      isEnabled: true,
    },
  });

  // Create/Update API setting mutation
  const saveApiSettingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof apiSettingSchema>) => {
      const res = await apiRequest("POST", "/api/broadband/endpoints", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/broadband/endpoints'] });
      setIsApiSettingModalOpen(false);
      form.reset();
      toast({
        title: "API Setting saved",
        description: "API endpoint setting has been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving API setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (masterCategory: string) => {
      const res = await apiRequest("POST", "/api/broadband/test-connection", { masterCategory });
      return res.json();
    },
    onSuccess: (data) => {
      setTestConnectionResult({
        success: data.success,
        message: data.success ? "Connection successful" : data.error || "Unknown error",
      });
      setIsTestingConnection(false);
    },
    onError: (error) => {
      setTestConnectionResult({
        success: false,
        message: error.message || "Connection failed",
      });
      setIsTestingConnection(false);
    },
  });

  const onSubmit = (values: z.infer<typeof apiSettingSchema>) => {
    saveApiSettingMutation.mutate(values);
  };

  const handleAddNew = () => {
    form.reset({
      name: "",
      endpoint: "",
      masterCategory: activeTab,
      isEnabled: true,
    });
    setIsApiSettingModalOpen(true);
  };

  const handleEdit = (apiSetting: ApiSetting) => {
    form.reset({
      id: apiSetting.id,
      name: apiSetting.name,
      endpoint: apiSetting.endpoint,
      masterCategory: apiSetting.masterCategory as "MTN Fixed" | "MTN GSM",
      isEnabled: apiSetting.isEnabled === null ? true : apiSetting.isEnabled,
    });
    setIsApiSettingModalOpen(true);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    setTestConnectionResult(null);
    testConnectionMutation.mutate(activeTab);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-neutral-darker">API Integration</h1>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Broadband.is API Integration</CardTitle>
            <CardDescription>
              Connect to the Broadband.is REST API to manage MTN Fixed and MTN GSM services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">API Credentials</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="font-medium">MTN Fixed:</div>
                    <div className="col-span-2">api@openweb.email</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="font-medium">MTN GSM:</div>
                    <div className="col-span-2">api@openweb.email.gsm</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="font-medium">Password:</div>
                    <div className="col-span-2">••••••••••</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Test Connection</h3>
                <div className="space-y-4">
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={isTestingConnection}
                    variant="outline"
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        Test API Connection
                      </>
                    )}
                  </Button>
                  
                  {testConnectionResult && (
                    <Alert variant={testConnectionResult.success ? "default" : "destructive"}>
                      {testConnectionResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {testConnectionResult.success ? "Success" : "Error"}
                      </AlertTitle>
                      <AlertDescription>
                        {testConnectionResult.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'MTN Fixed' | 'MTN GSM')}
          className="mt-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="MTN Fixed">MTN Fixed</TabsTrigger>
            <TabsTrigger value="MTN GSM">MTN GSM</TabsTrigger>
          </TabsList>

          {['MTN Fixed', 'MTN GSM'].map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle>{category} API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingApiSettings ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiSettings?.filter(setting => setting.masterCategory === category).map((setting) => (
                          <TableRow key={setting.id}>
                            <TableCell className="font-medium">{setting.name}</TableCell>
                            <TableCell>{setting.endpoint}</TableCell>
                            <TableCell>
                              {setting.isEnabled ? (
                                <Badge variant="outline" className="bg-success bg-opacity-10 text-success">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-neutral bg-opacity-10 text-neutral-dark">
                                  Disabled
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(setting)}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!apiSettings || apiSettings.filter(setting => setting.masterCategory === category).length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                              No API endpoints configured
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* API Setting Modal */}
        <Dialog open={isApiSettingModalOpen} onOpenChange={setIsApiSettingModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {form.getValues("id") ? "Edit API Endpoint" : "Add API Endpoint"}
              </DialogTitle>
              <DialogDescription>
                Configure the API endpoint for integration with Broadband.is
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter endpoint name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint Path</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/packages"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="masterCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select master category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MTN Fixed">MTN Fixed</SelectItem>
                          <SelectItem value="MTN GSM">MTN GSM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enabled</FormLabel>
                        <FormDescription>
                          Enable or disable this API endpoint
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={saveApiSettingMutation.isPending}
                  >
                    {saveApiSettingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Endpoint"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
