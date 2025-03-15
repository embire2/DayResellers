import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// API endpoint details from documentation
const apiEndpoints = [
  {
    id: "get-packages",
    name: "Get Packages",
    description: "List all available packages for the specified category",
    endpoint: "/packages",
    category: "MTN Fixed",
    method: "GET",
    params: [],
  },
  {
    id: "get-package-details",
    name: "Get Package Details",
    description: "Get details of a specific package by ID",
    endpoint: "/packages/{id}",
    category: "MTN Fixed",
    method: "GET",
    params: [
      { name: "id", type: "path", description: "Package ID", required: true }
    ],
  },
  {
    id: "package-availability",
    name: "Check Package Availability",
    description: "Check if a package is available at a specific location",
    endpoint: "/packages/availability",
    category: "MTN Fixed",
    method: "POST",
    params: [
      { name: "packageId", type: "body", description: "Package ID", required: true },
      { name: "location", type: "body", description: "Location coordinates or address", required: true }
    ],
  },
  {
    id: "register-sim",
    name: "Register SIM",
    description: "Register a new SIM card for a customer",
    endpoint: "/sims/register",
    category: "MTN GSM",
    method: "POST",
    params: [
      { name: "simNumber", type: "body", description: "SIM card number", required: true },
      { name: "customerName", type: "body", description: "Customer's full name", required: true },
      { name: "customerIdNumber", type: "body", description: "Customer ID number", required: true },
      { name: "contactNumber", type: "body", description: "Contact phone number", required: true },
      { name: "address", type: "body", description: "Physical address", required: true }
    ],
  },
  {
    id: "get-sim-status",
    name: "Get SIM Status",
    description: "Check the status of a SIM card",
    endpoint: "/sims/{simNumber}/status",
    category: "MTN GSM",
    method: "GET",
    params: [
      { name: "simNumber", type: "path", description: "SIM card number", required: true }
    ],
  },
  {
    id: "topup-sim",
    name: "Topup SIM",
    description: "Add data or airtime to a SIM card",
    endpoint: "/sims/{simNumber}/topup",
    category: "MTN GSM",
    method: "POST",
    params: [
      { name: "simNumber", type: "path", description: "SIM card number", required: true },
      { name: "amount", type: "body", description: "Amount to topup", required: true },
      { name: "type", type: "body", description: "Type of topup (data or airtime)", required: true }
    ],
  },
  {
    id: "get-data-usage",
    name: "Get Data Usage",
    description: "Check data usage statistics for a SIM card",
    endpoint: "/sims/{simNumber}/usage",
    category: "MTN GSM",
    method: "GET",
    params: [
      { name: "simNumber", type: "path", description: "SIM card number", required: true }
    ],
  },
  {
    id: "service-activation",
    name: "Service Activation",
    description: "Activate a service at a specific location",
    endpoint: "/services/activate",
    category: "MTN Fixed",
    method: "POST",
    params: [
      { name: "packageId", type: "body", description: "Package ID", required: true },
      { name: "customerName", type: "body", description: "Customer's full name", required: true },
      { name: "customerIdNumber", type: "body", description: "Customer ID number", required: true },
      { name: "contactNumber", type: "body", description: "Contact phone number", required: true },
      { name: "installationAddress", type: "body", description: "Installation address", required: true }
    ],
  },
  {
    id: "get-service-status",
    name: "Get Service Status",
    description: "Check the status of a service installation or connection",
    endpoint: "/services/{serviceId}/status",
    category: "MTN Fixed",
    method: "GET",
    params: [
      { name: "serviceId", type: "path", description: "Service ID", required: true }
    ],
  },
  {
    id: "suspend-service",
    name: "Suspend Service",
    description: "Temporarily suspend a service",
    endpoint: "/services/{serviceId}/suspend",
    category: "MTN Fixed",
    method: "POST",
    params: [
      { name: "serviceId", type: "path", description: "Service ID", required: true },
      { name: "reason", type: "body", description: "Reason for suspension", required: true }
    ],
  },
];

export default function ApiTest() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'MTN Fixed' | 'MTN GSM'>('MTN Fixed');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiResponse, setApiResponse] = useState<{
    status: "success" | "error";
    data: any;
  } | null>(null);

  // Filter endpoints by category
  const filteredEndpoints = apiEndpoints.filter(
    endpoint => endpoint.category === activeCategory
  );

  // Get selected endpoint details
  const selectedEndpointDetails = apiEndpoints.find(
    endpoint => endpoint.id === selectedEndpoint
  );

  // Form schema for API test
  const formSchema = z.object({
    pathParams: z.record(z.string().optional()),
    queryParams: z.record(z.string().optional()),
    bodyParams: z.record(z.string().optional()),
  });

  // Form for API parameters
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pathParams: {},
      queryParams: {},
      bodyParams: {},
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const { success } = await apiRequest("POST", "/api/broadband/test-connection", { 
        masterCategory: activeCategory 
      }).then(res => res.json());
      
      if (!success) {
        throw new Error("API connection failed. Please check credentials.");
      }
      return success;
    },
  });

  // Execute API test mutation
  const executeApiTestMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof formSchema>) => {
      const { pathParams, queryParams, bodyParams } = formData;
      
      if (!selectedEndpointDetails) {
        throw new Error("No endpoint selected");
      }
      
      // Prepare the endpoint URL with path parameters
      let endpoint = selectedEndpointDetails.endpoint;
      Object.entries(pathParams).forEach(([key, value]) => {
        if (value) {
          endpoint = endpoint.replace(`{${key}}`, value);
        }
      });
      
      // Add query parameters
      const queryString = Object.entries(queryParams)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
        .join("&");
        
      if (queryString) {
        endpoint += `?${queryString}`;
      }
      
      // Create request body if method is POST
      const body = selectedEndpointDetails.method === "POST" ? bodyParams : undefined;
      
      // Execute API call
      const response = await apiRequest(
        "POST", 
        "/api/broadband/execute-test", 
        {
          masterCategory: activeCategory,
          endpoint,
          method: selectedEndpointDetails.method,
          body
        }
      );
      
      return response.json();
    },
    onSuccess: (data) => {
      setApiResponse({
        status: data.success ? "success" : "error",
        data: data
      });
    },
    onError: (error) => {
      setApiResponse({
        status: "error",
        data: { error: error.message }
      });
    },
    onSettled: () => {
      setIsTestingAPI(false);
    }
  });

  // Handle endpoint selection
  const handleEndpointSelect = (endpointId: string) => {
    setSelectedEndpoint(endpointId);
    
    // Reset form with empty values for the new endpoint
    const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
    if (endpoint) {
      const pathParams: Record<string, string> = {};
      const queryParams: Record<string, string> = {};
      const bodyParams: Record<string, string> = {};
      
      endpoint.params.forEach(param => {
        if (param.type === "path") {
          pathParams[param.name] = "";
        } else if (param.type === "query") {
          queryParams[param.name] = "";
        } else if (param.type === "body") {
          bodyParams[param.name] = "";
        }
      });
      
      form.reset({
        pathParams,
        queryParams,
        bodyParams
      });
    }
    
    setApiResponse(null);
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsTestingAPI(true);
    executeApiTestMutation.mutate(values);
  };

  // Test API connection
  const handleTestConnection = () => {
    setIsTestingAPI(true);
    testConnectionMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Connection successful",
          description: "Successfully connected to Broadband.is API",
        });
        setIsTestingAPI(false);
      },
      onError: (error) => {
        toast({
          title: "Connection failed",
          description: error.message,
          variant: "destructive",
        });
        setIsTestingAPI(false);
      }
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">API Test Console</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Broadband.is API Test Environment</CardTitle>
            <CardDescription>
              Test Broadband.is API endpoints directly with your credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-neutral-dark mb-4">
                  This tool allows you to test API endpoints against the Broadband.is API. Select a category and endpoint to begin testing.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleTestConnection} 
                disabled={isTestingAPI}
              >
                {isTestingAPI && testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing connection...
                  </>
                ) : (
                  <>Test API Connection</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* API Endpoint Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>
                  Select endpoint to test
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeCategory}
                  onValueChange={(value) => {
                    setActiveCategory(value as 'MTN Fixed' | 'MTN GSM');
                    setSelectedEndpoint(null);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="MTN Fixed">MTN Fixed</TabsTrigger>
                    <TabsTrigger value="MTN GSM">MTN GSM</TabsTrigger>
                  </TabsList>
                  
                  {["MTN Fixed", "MTN GSM"].map((category) => (
                    <TabsContent key={category} value={category} className="space-y-4">
                      <div className="space-y-2">
                        {filteredEndpoints.map((endpoint) => (
                          <div
                            key={endpoint.id}
                            onClick={() => handleEndpointSelect(endpoint.id)}
                            className={`p-3 rounded-md cursor-pointer border ${
                              selectedEndpoint === endpoint.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-medium">{endpoint.name}</h3>
                                <p className="text-sm text-neutral">{endpoint.description}</p>
                              </div>
                              <div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  endpoint.method === "GET" 
                                    ? "bg-blue-100 text-blue-800" 
                                    : "bg-green-100 text-green-800"
                                }`}>
                                  {endpoint.method}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          {/* API Testing Panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedEndpointDetails ? selectedEndpointDetails.name : "Select an endpoint"}
                </CardTitle>
                <CardDescription>
                  {selectedEndpointDetails ? `${selectedEndpointDetails.method} ${selectedEndpointDetails.endpoint}` : "Choose an endpoint from the left panel"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEndpointDetails ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Endpoint Details</h3>
                        <p className="text-sm">{selectedEndpointDetails.description}</p>
                        
                        {/* Path Parameters */}
                        {selectedEndpointDetails.params.some(p => p.type === "path") && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Path Parameters</h4>
                            {selectedEndpointDetails.params
                              .filter(param => param.type === "path")
                              .map(param => (
                                <FormField
                                  key={param.name}
                                  control={form.control}
                                  name={`pathParams.${param.name}`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{param.name}</FormLabel>
                                      <FormControl>
                                        <Input placeholder={param.description} {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        {param.description}
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            ))}
                          </div>
                        )}
                        
                        {/* Query Parameters */}
                        {selectedEndpointDetails.params.some(p => p.type === "query") && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Query Parameters</h4>
                            {selectedEndpointDetails.params
                              .filter(param => param.type === "query")
                              .map(param => (
                                <FormField
                                  key={param.name}
                                  control={form.control}
                                  name={`queryParams.${param.name}`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>{param.name}</FormLabel>
                                      <FormControl>
                                        <Input placeholder={param.description} {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        {param.description}
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            ))}
                          </div>
                        )}
                        
                        {/* Body Parameters */}
                        {selectedEndpointDetails.method === "POST" && selectedEndpointDetails.params.some(p => p.type === "body") && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Request Body</h4>
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="body-params">
                                <AccordionTrigger>Body Parameters</AccordionTrigger>
                                <AccordionContent>
                                  {selectedEndpointDetails.params
                                    .filter(param => param.type === "body")
                                    .map(param => (
                                      <FormField
                                        key={param.name}
                                        control={form.control}
                                        name={`bodyParams.${param.name}`}
                                        render={({ field }) => (
                                          <FormItem className="mb-4">
                                            <FormLabel>{param.name}</FormLabel>
                                            <FormControl>
                                              <Input placeholder={param.description} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                              {param.description}
                                            </FormDescription>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                  ))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={isTestingAPI || executeApiTestMutation.isPending}
                      >
                        {isTestingAPI || executeApiTestMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          'Execute API Call'
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <div className="flex justify-center items-center h-48">
                    <p className="text-neutral">Select an endpoint from the left panel to begin testing</p>
                  </div>
                )}
                
                {/* API Response */}
                {apiResponse && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-2">Response</h3>
                    <Alert variant={apiResponse.status === "success" ? "default" : "destructive"}>
                      <div className="flex items-center gap-2">
                        {apiResponse.status === "success" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {apiResponse.status === "success" ? "Success" : "Error"}
                        </AlertTitle>
                      </div>
                      <AlertDescription>
                        {apiResponse.status === "success" 
                          ? "API call executed successfully" 
                          : "API call failed. See details below."}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                      <h4 className="text-sm font-medium mb-2">Response Data</h4>
                      <Textarea
                        className="font-mono text-sm"
                        value={JSON.stringify(apiResponse.data, null, 2)}
                        readOnly
                        rows={10}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}