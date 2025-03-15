import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

// Define schemas
const testUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "reseller"]),
  resellerGroup: z.string().optional(),
  creditBalance: z.string().optional(),
});

interface DiagnosticError {
  id: string;
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
  error: {
    message: string;
    name: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  requestData?: any;
  userId?: number;
  username?: string;
  ip?: string;
  userAgent?: string;
}

interface SystemStatus {
  timestamp: string;
  uptime: number;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
  users: {
    total: number;
    admins: number;
    resellers: number;
  };
  recentErrors: Array<{
    id: string;
    timestamp: string;
    path: string;
    method: string;
    error: string;
  }>;
}

export default function Diagnostics() {
  const { toast } = useToast();
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  
  // Fetch system status
  const { data: systemStatus, isLoading: systemLoading, refetch: refetchSystemStatus } = useQuery<SystemStatus>({
    queryKey: ['/api/admin/diagnostics/system'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
  
  // Fetch diagnostic errors
  const { data: errors, isLoading: errorsLoading, refetch: refetchErrors } = useQuery<DiagnosticError[]>({
    queryKey: ['/api/admin/diagnostics/errors'],
    refetchInterval: 15000, // Auto-refresh every 15 seconds
  });
  
  // Fetch specific error details
  const { data: errorDetail, isLoading: errorDetailLoading } = useQuery<DiagnosticError>({
    queryKey: ['/api/admin/diagnostics/errors', selectedErrorId],
    enabled: !!selectedErrorId, // Only run when an error is selected
  });
  
  // Test user creation form
  const form = useForm<z.infer<typeof testUserSchema>>({
    resolver: zodResolver(testUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "reseller",
      resellerGroup: "1",
      creditBalance: "0",
    },
  });
  
  // Test user creation mutation
  const testUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof testUserSchema>) => {
      const res = await apiRequest("POST", "/api/admin/diagnostics/test-user-creation", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test successful",
          description: "Test user creation was successful!",
          variant: "default",
        });
      } else {
        toast({
          title: "Test failed",
          description: `Failed at stage: ${data.stage}: ${data.message}`,
          variant: "destructive",
        });
      }
      // Refresh diagnostics data after test
      refetchSystemStatus();
      refetchErrors();
    },
    onError: (error) => {
      toast({
        title: "Test error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof testUserSchema>) => {
    testUserMutation.mutate(values);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-neutral-darker">System Diagnostics</h1>
          <Button variant="outline" onClick={() => {
            refetchSystemStatus();
            refetchErrors();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        
        <Tabs defaultValue="system" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="system">System Status</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
            <TabsTrigger value="test">Test User Creation</TabsTrigger>
          </TabsList>
          
          {/* System Status Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>
                    Current system status and resource usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {systemLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : systemStatus ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Server Time</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(systemStatus.timestamp)}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Uptime</h3>
                        <p className="text-sm text-muted-foreground">
                          {Math.floor(systemStatus.uptime / 3600)} hours, {Math.floor((systemStatus.uptime % 3600) / 60)} minutes
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Memory Usage</h3>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">RSS:</span> {systemStatus.memory.rss}<br />
                          <span className="font-medium">Heap Total:</span> {systemStatus.memory.heapTotal}<br />
                          <span className="font-medium">Heap Used:</span> {systemStatus.memory.heapUsed}<br />
                          <span className="font-medium">External:</span> {systemStatus.memory.external}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Failed to load system status information.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                  <CardDescription>
                    Current user counts by role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {systemLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : systemStatus ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-50 rounded-md p-4 text-center">
                        <h3 className="text-lg font-bold">{systemStatus.users.total}</h3>
                        <p className="text-sm">Total Users</p>
                      </div>
                      <div className="bg-blue-50 rounded-md p-4 text-center">
                        <h3 className="text-lg font-bold">{systemStatus.users.admins}</h3>
                        <p className="text-sm">Admins</p>
                      </div>
                      <div className="bg-amber-50 rounded-md p-4 text-center">
                        <h3 className="text-lg font-bold">{systemStatus.users.resellers}</h3>
                        <p className="text-sm">Resellers</p>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Failed to load user statistics.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Errors Section */}
            {systemStatus && systemStatus.recentErrors.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>
                    The 5 most recent error events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemStatus.recentErrors.map((error) => (
                        <TableRow key={error.id}>
                          <TableCell>{new Date(error.timestamp).toLocaleTimeString()}</TableCell>
                          <TableCell>{error.path}</TableCell>
                          <TableCell>{error.method}</TableCell>
                          <TableCell className="max-w-xs truncate">{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Error Logs Tab */}
          <TabsContent value="errors">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Error List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Error Log</CardTitle>
                  <CardDescription>
                    Recorded system errors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {errorsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : errors && errors.length > 0 ? (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {errors.map((error) => (
                        <div 
                          key={error.id} 
                          className={`p-3 rounded-md cursor-pointer border ${selectedErrorId === error.id ? 'border-primary bg-primary/5' : 'border-muted'}`}
                          onClick={() => setSelectedErrorId(error.id)}
                        >
                          <p className="text-sm font-medium truncate">{error.error.message}</p>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{error.method} {error.path}</span>
                            <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No errors recorded yet!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Error Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Error Details</CardTitle>
                  <CardDescription>
                    Detailed information about the selected error
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedErrorId ? (
                    errorDetailLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      </div>
                    ) : errorDetail ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium">Error</h3>
                          <p className="mt-1 p-2 bg-slate-50 rounded-md text-sm">{errorDetail.error.message}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-medium">Timestamp</h3>
                            <p className="text-sm text-muted-foreground">{formatDate(errorDetail.timestamp)}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Request ID</h3>
                            <p className="text-sm text-muted-foreground">{errorDetail.requestId}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Path</h3>
                            <p className="text-sm text-muted-foreground">{errorDetail.method} {errorDetail.path}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">User</h3>
                            <p className="text-sm text-muted-foreground">
                              {errorDetail.username ? `${errorDetail.username} (ID: ${errorDetail.userId})` : 'Not authenticated'}
                            </p>
                          </div>
                        </div>
                        
                        {errorDetail.requestData && (
                          <div>
                            <h3 className="text-sm font-medium">Request Data</h3>
                            <pre className="mt-1 p-2 bg-slate-50 rounded-md text-xs overflow-auto max-h-40">
                              {JSON.stringify(errorDetail.requestData, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {errorDetail.error.stack && (
                          <div>
                            <h3 className="text-sm font-medium">Stack Trace</h3>
                            <pre className="mt-1 p-2 bg-slate-50 rounded-md text-xs overflow-auto max-h-60">
                              {errorDetail.error.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                          Failed to load error details.
                        </AlertDescription>
                      </Alert>
                    )
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>Select an error from the list to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Test User Creation Tab */}
          <TabsContent value="test">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Test User Creation</CardTitle>
                  <CardDescription>
                    Test the user creation process with diagnostic logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter test username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="reseller">Reseller</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="resellerGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reseller Group</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">Group 1</SelectItem>
                                <SelectItem value="2">Group 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="creditBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Credit Balance</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={testUserMutation.isPending}
                      >
                        {testUserMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          "Run Test"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>
                    Results from the test user creation process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {testUserMutation.data ? (
                    <div className="space-y-4">
                      {testUserMutation.data.success ? (
                        <Alert className="bg-green-50 border-green-500">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertTitle className="text-green-700">Test Successful</AlertTitle>
                          <AlertDescription className="text-green-600">
                            User creation test passed successfully. All stages completed without errors.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Test Failed</AlertTitle>
                          <AlertDescription>
                            User creation test failed at stage: <span className="font-semibold">{testUserMutation.data.stage}</span>
                            <br />
                            Error: {testUserMutation.data.message}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {testUserMutation.data.data && (
                        <div>
                          <h3 className="text-sm font-medium">Test Data</h3>
                          <pre className="mt-1 p-2 bg-slate-50 rounded-md text-xs overflow-auto max-h-60">
                            {JSON.stringify(testUserMutation.data.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : testUserMutation.isError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {testUserMutation.error.message}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>Run a test to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}