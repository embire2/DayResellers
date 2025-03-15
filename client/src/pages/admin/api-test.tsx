import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { BroadbandApiResponse } from '@shared/types';

const formSchema = z.object({
  masterCategory: z.enum(['MTN Fixed', 'MTN GSM']),
  endpoint: z.string().min(1, 'Endpoint is required'),
  inputParams: z.string().optional(),
});

export default function ApiTest() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<BroadbandApiResponse | null>(null);
  const [errors, setErrors] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      masterCategory: 'MTN Fixed',
      endpoint: '',
      inputParams: '',
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setApiResponse(null);
    setErrors(null);

    try {
      let params = {};
      if (data.inputParams) {
        try {
          params = JSON.parse(data.inputParams);
        } catch (e) {
          setErrors('Invalid JSON in parameters');
          setIsLoading(false);
          return;
        }
      }

      const response = await apiRequest(
        'POST',
        '/api/test-broadband-api',
        {
          masterCategory: data.masterCategory,
          endpoint: data.endpoint,
          params,
        }
      );

      const result = await response.json();
      setApiResponse(result);
    } catch (error) {
      console.error('Error testing API:', error);
      setErrors(error instanceof Error ? error.message : 'An unknown error occurred');
      toast({
        title: 'API Test Failed',
        description: error instanceof Error ? error.message : 'Failed to test the API',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // List of example endpoints for MTN Fixed and MTN GSM
  const endpointExamples = {
    'MTN Fixed': [
      { name: 'Get Client Details', endpoint: 'clients/getClientDetails', params: { clientNumber: '123456' } },
      { name: 'Get Product List', endpoint: 'products/getProducts', params: {} },
      { name: 'Get Package Info', endpoint: 'products/getPackage', params: { packageCode: 'UNCAPPED-HOME-10' } },
      { name: 'Get Coverage', endpoint: 'coverage/getCoverage', params: { address: '123 Main St' } },
      { name: 'Get Order Status', endpoint: 'orders/getOrderStatus', params: { orderNumber: 'ORD123456' } },
    ],
    'MTN GSM': [
      { name: 'Get SIM Status', endpoint: 'sims/getSimStatus', params: { simNumber: '12345678901234567' } },
      { name: 'Get Data Bundles', endpoint: 'bundles/getDataBundles', params: {} },
      { name: 'Get Usage', endpoint: 'usage/getDataUsage', params: { simNumber: '12345678901234567' } },
      { name: 'Activate SIM', endpoint: 'sims/activate', params: { simNumber: '12345678901234567', packageCode: 'DATA-1GB' } },
      { name: 'Get Coverage Map', endpoint: 'coverage/getGsmCoverage', params: { latitude: '-25.123456', longitude: '28.123456' } },
    ]
  };

  const handleEndpointSelect = (example: any) => {
    form.setValue('endpoint', example.endpoint);
    form.setValue('inputParams', JSON.stringify(example.params, null, 2));
  };

  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return String(json);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Test Console</h1>
            <p className="text-muted-foreground mt-2">
              Test broadband.is API endpoints directly from this console
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>API Test Form</CardTitle>
                  <CardDescription>
                    Select API category, endpoint, and parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="masterCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MTN Fixed">MTN Fixed</SelectItem>
                                <SelectItem value="MTN GSM">MTN GSM</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select which broadband.is API to use
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Endpoint</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. clients/getClientDetails" {...field} />
                            </FormControl>
                            <FormDescription>
                              Enter the API endpoint path
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="inputParams"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parameters (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder='{"param1": "value1", "param2": "value2"}'
                                className="font-mono h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter request parameters in JSON format
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Testing...' : 'Test API Endpoint'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Example Endpoints</CardTitle>
                  <CardDescription>
                    Click an example to prefill the form
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="mtn-fixed">
                      <AccordionTrigger>MTN Fixed Examples</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {endpointExamples['MTN Fixed'].map((example, index) => (
                            <Button 
                              key={index} 
                              variant="outline" 
                              className="w-full justify-start text-left"
                              onClick={() => handleEndpointSelect(example)}
                            >
                              {example.name}
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="mtn-gsm">
                      <AccordionTrigger>MTN GSM Examples</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {endpointExamples['MTN GSM'].map((example, index) => (
                            <Button 
                              key={index} 
                              variant="outline" 
                              className="w-full justify-start text-left"
                              onClick={() => handleEndpointSelect(example)}
                            >
                              {example.name}
                            </Button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    API Response
                    {apiResponse && (
                      <Badge variant={apiResponse.success ? "default" : "destructive"}>
                        {apiResponse.success ? "Success" : "Error"}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Results from the API call will appear here
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : errors ? (
                    <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                      <h3 className="font-medium">Error</h3>
                      <p className="mt-1">{errors}</p>
                    </div>
                  ) : apiResponse ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Status</h3>
                        <div className={`p-2 rounded-md ${apiResponse.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {apiResponse.success ? 'Success' : 'Failed'}
                        </div>
                      </div>
                      
                      {apiResponse.error && (
                        <div>
                          <h3 className="font-medium mb-2">Error</h3>
                          <div className="bg-red-100 p-2 rounded-md text-red-800">
                            {apiResponse.error}
                          </div>
                        </div>
                      )}
                      
                      {apiResponse.data && (
                        <div>
                          <h3 className="font-medium mb-2">Response Data</h3>
                          <pre className="bg-background p-4 rounded-md overflow-auto max-h-[400px] text-sm border">
                            {formatJson(apiResponse.data)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>Test an API endpoint to see results</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  Using broadband.is API integration for {form.watch('masterCategory')}
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}