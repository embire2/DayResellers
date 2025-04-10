import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Product, UserProduct, ApiSetting, UserProductEndpoint } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditableField } from "@/components/ui/editable-field";
import { EndpointDialog } from "@/components/user-products/endpoint-dialog";
import { RunEndpointDialog } from "@/components/user-products/run-endpoint-dialog";
import { UsageDataTab } from "@/components/user-products/usage-data-tab";
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash, 
  RefreshCw,
  ArrowLeft, 
  Terminal,
  Link as LinkIcon,
  PackageOpen,
  AlertCircle,
  Play,
  BarChart,
  Activity
} from "lucide-react";

interface UserProductWithDetails extends UserProduct {
  product?: Product;
  endpoints?: UserProductEndpoint[];
}

export default function UserProductsPage() {
  // Get userId from URL
  const params = useParams();
  const [, setLocation] = useLocation();
  const userId = params.userId ? parseInt(params.userId) : null;
  
  console.log("User-products page - params:", params);
  console.log("User-products page - userId:", userId);
  
  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddEndpointDialogOpen, setIsAddEndpointDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRunEndpointDialogOpen, setIsRunEndpointDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UserProductWithDetails | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<UserProductEndpoint | null>(null);
  const [selectedApiSettingName, setSelectedApiSettingName] = useState<string>('');
  const [formData, setFormData] = useState({
    productId: '',
    username: '',
    msisdn: '',
    simNumber: '',
    status: 'pending',
    comments: ''
  });
  const [endpointFormData, setEndpointFormData] = useState({
    apiSettingId: '',
    endpointPath: '', // New field for the actual API endpoint path
    customParameters: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries - Fetch all users to get the current user details
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn<User[]>({ on401: "returnNull" }),
    enabled: !!userId,
    retry: 1,
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch user details. Please try again.",
        variant: "destructive"
      });
      console.error("Error fetching users:", error);
    }
  });
  
  // Extract the current user from the list
  const user = allUsers?.find(u => u.id === userId);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: getQueryFn<Product[]>({ on401: "returnNull" })
  });

  const { data: apiSettings = [], isLoading: apiSettingsLoading } = useQuery({
    queryKey: ['/api/api-settings'],
    queryFn: getQueryFn<ApiSetting[]>({ on401: "returnNull" })
  });

  const { data: userProducts = [], isLoading: userProductsLoading, refetch: refetchUserProducts } = useQuery({
    queryKey: ['/api/user-products', userId],
    queryFn: async ({ signal }) => {
      console.log(`Fetching user products for userId: ${userId}`);
      
      // Use native fetch with explicit options for more control
      const response = await fetch(`/api/user-products/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user products: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('User products API response:', result);
      return result as UserProductWithDetails[];
    },
    enabled: !!userId,
    staleTime: 0, // Don't cache the results - always get fresh data
    refetchOnMount: true, // Always refetch when component is mounted
    refetchOnWindowFocus: false // Don't auto refetch when window regains focus
  });

  // Mutations
  const createUserProductMutation = useMutation({
    mutationFn: async (data: typeof formData & { userId: number }) => {
      const payload = {
        userId: data.userId,
        productId: parseInt(data.productId),
        username: data.username || null,
        msisdn: data.msisdn || null,
        simNumber: data.simNumber || null,
        status: data.status,
        comments: data.comments || null
      };
      console.log('Creating user product with payload:', payload);
      
      const response = await apiRequest('POST', '/api/user-products', payload);
      
      // Process the response to extract the JSON data
      const responseData = await response.json();
      console.log('User product creation response:', responseData);
      return responseData;
    },
    onSuccess: (data) => {
      console.log('User product created successfully:', data);
      // Force refetch after successful creation
      refetchUserProducts();
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Product assigned",
        description: "The product has been successfully assigned to the user.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error('Error creating user product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign product. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteUserProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/user-products/${id}`);
      // For DELETE operations, we may not get a response body
      return response;
    },
    onSuccess: () => {
      // Force refetch after deleting
      refetchUserProducts();
      setIsDeleteDialogOpen(false);
      toast({
        title: "Product removed",
        description: "The product has been successfully removed from the user.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove product. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addEndpointMutation = useMutation({
    mutationFn: async (data: { userProductId: number, apiSettingId: number, endpointPath: string, customParameters?: string }) => {
      const payload = {
        userProductId: data.userProductId,
        apiSettingId: data.apiSettingId,
        endpointPath: data.endpointPath,
        customParameters: data.customParameters ? JSON.parse(data.customParameters) : null
      };
      console.log('Adding endpoint with payload:', payload);
      const response = await apiRequest('POST', `/api/user-products/${data.userProductId}/endpoints`, payload);
      try {
        return await response.json();
      } catch (e) {
        // In case the endpoint doesn't return JSON
        return response;
      }
    },
    onSuccess: () => {
      // Force refetch after endpoint addition
      refetchUserProducts();
      setIsAddEndpointDialogOpen(false);
      setEndpointFormData({
        apiSettingId: '',
        endpointPath: '',
        customParameters: ''
      });
      toast({
        title: "Endpoint added",
        description: "The API endpoint has been successfully added to the user product.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add endpoint. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteEndpointMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/user-products/endpoints/${id}`);
      // For DELETE operations, we may not get a response body
      return response;
    },
    onSuccess: () => {
      // Force refetch after endpoint deletion
      refetchUserProducts();
      toast({
        title: "Endpoint removed",
        description: "The API endpoint has been successfully removed.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove endpoint. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateUserProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<UserProduct> }) => {
      const response = await apiRequest('PATCH', `/api/user-products/${id}`, data);
      try {
        return await response.json();
      } catch (e) {
        // In case the endpoint doesn't return JSON
        return response;
      }
    },
    onSuccess: () => {
      // Force refetch after update
      refetchUserProducts();
      toast({
        title: "Product updated",
        description: "The product details have been successfully updated.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEndpointInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEndpointFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEndpointSelectChange = (name: string, value: string) => {
    setEndpointFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      username: '',
      msisdn: '',
      simNumber: '',
      status: 'pending',
      comments: ''
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openAddEndpointDialog = (product: UserProductWithDetails) => {
    setSelectedProduct(product);
    setIsAddEndpointDialogOpen(true);
  };

  const openDeleteDialog = (product: UserProductWithDetails) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleAdd = () => {
    if (userId) {
      createUserProductMutation.mutate({
        ...formData,
        userId
      });
    }
  };

  const handleDelete = () => {
    if (selectedProduct) {
      deleteUserProductMutation.mutate(selectedProduct.id);
    }
  };

  const handleAddEndpoint = () => {
    if (selectedProduct && endpointFormData.apiSettingId && endpointFormData.endpointPath) {
      addEndpointMutation.mutate({
        userProductId: selectedProduct.id,
        apiSettingId: parseInt(endpointFormData.apiSettingId),
        endpointPath: endpointFormData.endpointPath,
        customParameters: endpointFormData.customParameters || undefined
      });
    } else {
      toast({
        title: "Validation Error",
        description: "API endpoint and endpoint path are required.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEndpoint = (endpointId: number) => {
    deleteEndpointMutation.mutate(endpointId);
  };
  
  const handleRunEndpoint = (endpoint: UserProductEndpoint, apiSettingName: string) => {
    setSelectedEndpoint(endpoint);
    setSelectedApiSettingName(apiSettingName);
    setIsRunEndpointDialogOpen(true);
  };
  
  const handleUpdateUserProduct = (id: number, field: string, value: string) => {
    updateUserProductMutation.mutate({
      id,
      data: { [field]: value === 'N/A' ? null : value }
    });
  };

  const renderProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">{status}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500">{status}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderEndpointName = (apiSettingId: number) => {
    const apiSetting = apiSettings.find((s) => s.id === apiSettingId);
    return apiSetting ? apiSetting.name : 'Unknown Endpoint';
  };

  // Display a more comprehensive loading state
  if (usersLoading || productsLoading || apiSettingsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user and product data...</p>
        </div>
      </div>
    );
  }

  // Check if user exists
  console.log("User fetch result:", user);
  
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center p-10 border rounded-lg shadow-sm">
          <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            The requested user (ID: {userId}) could not be found in the system. 
            Please check the user ID and try again.
          </p>
          <Button onClick={() => setLocation('/admin/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User Management
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Products</h1>
          <p className="text-muted-foreground">Managing products for {user.username}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/admin/users')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetchUserProducts()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openAddDialog} aria-label="Add Product">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="issue">Suspended/Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <UserProductsList 
            userProducts={userProducts} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            onRunEndpoint={handleRunEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
            onUpdateField={handleUpdateUserProduct}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'active')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            onRunEndpoint={handleRunEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
            onUpdateField={handleUpdateUserProduct}
          />
        </TabsContent>
        
        <TabsContent value="pending">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'pending')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            onRunEndpoint={handleRunEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
            onUpdateField={handleUpdateUserProduct}
          />
        </TabsContent>
        
        <TabsContent value="issue">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'suspended' || p.status === 'cancelled')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            onRunEndpoint={handleRunEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
            onUpdateField={handleUpdateUserProduct}
          />
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product to User</DialogTitle>
            <DialogDescription>
              Assign a product to {user.username}. The user will be able to access the product after approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="productId" className="text-right">
                Product
              </Label>
              <div className="col-span-3">
                <Select name="productId" value={formData.productId} onValueChange={(value) => handleSelectChange('productId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product: Product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="API username (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="msisdn" className="text-right">
                MSISDN
              </Label>
              <Input
                id="msisdn"
                name="msisdn"
                value={formData.msisdn}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Mobile number (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="simNumber" className="text-right">
                SIM Serial Number
              </Label>
              <Input
                id="simNumber"
                name="simNumber"
                value={formData.simNumber}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="SIM card serial number (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="comments" className="text-right">
                Comments
              </Label>
              <Textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                className="col-span-3"
                placeholder="Optional comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAdd} 
              disabled={createUserProductMutation.isPending || !formData.productId}
            >
              {createUserProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Endpoint Dialog */}
      <Dialog open={isAddEndpointDialogOpen} onOpenChange={setIsAddEndpointDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add API Endpoint</DialogTitle>
            <DialogDescription>
              {selectedProduct && `Add API endpoint to ${renderProductName(selectedProduct.productId)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiSettingId" className="text-right">
                API Endpoint
              </Label>
              <div className="col-span-3">
                <Select 
                  name="apiSettingId" 
                  value={endpointFormData.apiSettingId} 
                  onValueChange={(value) => handleEndpointSelectChange('apiSettingId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an API endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiSettings.map((setting: ApiSetting) => (
                      <SelectItem key={setting.id} value={setting.id.toString()}>
                        {setting.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endpointPath" className="text-right">
                Endpoint Path
              </Label>
              <Input
                id="endpointPath"
                name="endpointPath"
                value={endpointFormData.endpointPath}
                onChange={handleEndpointInputChange}
                className="col-span-3"
                placeholder="/rest/lte/usernameInfo.php"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customParameters" className="text-right">
                Parameters (JSON)
              </Label>
              <Textarea
                id="customParameters"
                name="customParameters"
                value={endpointFormData.customParameters}
                onChange={handleEndpointInputChange}
                className="col-span-3"
                placeholder='{"param1": "value1", "param2": "value2"}'
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEndpointDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleAddEndpoint} 
              disabled={addEndpointMutation.isPending || !endpointFormData.apiSettingId}
            >
              {addEndpointMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the product "{selectedProduct && renderProductName(selectedProduct.productId)}" from {user.username}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-700">
              {deleteUserProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run Endpoint Dialog */}
      {selectedEndpoint && (
        <RunEndpointDialog 
          isOpen={isRunEndpointDialogOpen}
          onClose={() => setIsRunEndpointDialogOpen(false)}
          endpoint={selectedEndpoint}
          apiSettingName={selectedApiSettingName}
        />
      )}
    </div>
  );
}

interface UserProductsListProps {
  userProducts: UserProductWithDetails[];
  isLoading: boolean;
  onDelete: (userProduct: UserProductWithDetails) => void;
  onAddEndpoint: (userProduct: UserProductWithDetails) => void;
  onDeleteEndpoint: (endpointId: number) => void;
  onRunEndpoint: (endpoint: UserProductEndpoint, apiSettingName: string) => void;
  renderProductName: (productId: number) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  renderEndpointName: (apiSettingId: number) => string;
  onUpdateField?: (id: number, field: string, value: string) => void;
}

function UserProductsList({ 
  userProducts,
  isLoading,
  onDelete,
  onAddEndpoint,
  onDeleteEndpoint,
  onRunEndpoint,
  renderProductName,
  renderStatusBadge,
  renderEndpointName,
  onUpdateField
}: UserProductsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (userProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-lg" aria-label="Empty products list">
        <PackageOpen className="h-12 w-12 text-yellow-500 mb-3" aria-hidden="true" />
        <h3 className="text-lg font-medium mb-1">No Products Assigned</h3>
        <p className="text-center text-muted-foreground mb-4">
          This user doesn't have any products assigned in this category.
        </p>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => document.querySelector('[aria-label="Add Product"]')?.click()}
          aria-label="Assign new product to user"
        >
          <Plus className="mr-2 h-4 w-4" />
          Assign New Product
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {userProducts.map((product) => (
        <Card key={product.id} className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{renderProductName(product.productId)}</CardTitle>
              <CardDescription className="flex flex-col gap-2">
                <div className="flex items-center">
                  <span className="w-24 text-xs font-medium">Username:</span>
                  {onUpdateField ? (
                    <EditableField
                      value={product.username || 'N/A'}
                      onSave={(value) => onUpdateField(product.id, 'username', value)}
                      placeholder="Enter username"
                      validate={(value) => ({ isValid: true })}
                    />
                  ) : (
                    <span>{product.username || 'N/A'}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-xs font-medium">MSISDN:</span>
                  {onUpdateField ? (
                    <EditableField
                      value={product.msisdn || 'N/A'}
                      onSave={(value) => onUpdateField(product.id, 'msisdn', value)}
                      placeholder="Enter MSISDN"
                      validate={(value) => ({ isValid: true })}
                    />
                  ) : (
                    <span>{product.msisdn || 'N/A'}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-xs font-medium">SIM Serial:</span>
                  {onUpdateField ? (
                    <EditableField
                      value={product.simNumber || 'N/A'}
                      onSave={(value) => onUpdateField(product.id, 'simNumber', value)}
                      placeholder="Enter SIM Serial Number"
                      validate={(value) => ({ isValid: true })}
                    />
                  ) : (
                    <span>{product.simNumber || 'N/A'}</span>
                  )}
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2">
                {onUpdateField ? (
                  <EditableField
                    value={product.status}
                    onSave={(value) => onUpdateField(product.id, 'status', value)}
                    type="select"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'suspended', label: 'Suspended' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ]}
                  />
                ) : (
                  renderStatusBadge(product.status)
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Created {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="details">
                  <div className="flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Details
                  </div>
                </TabsTrigger>
                <TabsTrigger value="endpoints">
                  <div className="flex items-center">
                    <Terminal className="h-4 w-4 mr-2" />
                    API Endpoints
                  </div>
                </TabsTrigger>
                {/* Only show usage tab for products with API identifier 145 */}
                {product.product?.apiIdentifier === '145' && (
                  <TabsTrigger value="usage">
                    <div className="flex items-center">
                      <BarChart className="h-4 w-4 mr-2" />
                      Usage Data
                    </div>
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="details">
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium">Comments</h4>
                  </div>
                  {onUpdateField ? (
                    <EditableField
                      value={product.comments || ''}
                      onSave={(value) => onUpdateField(product.id, 'comments', value)}
                      type="textarea"
                      placeholder="Add comments about this product assignment"
                      className="w-full"
                    />
                  ) : (
                    product.comments ? (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">{product.comments}</p>
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed rounded-md text-center">
                        <p className="text-sm text-muted-foreground">No comments added</p>
                      </div>
                    )
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="endpoints">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">API Endpoints</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onAddEndpoint(product)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Endpoint
                    </Button>
                  </div>
                  
                  {product.endpoints && product.endpoints.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>Parameters</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {product.endpoints.map((endpoint) => (
                            <TableRow key={endpoint.id}>
                              <TableCell>
                                {endpoint.apiSettingId && renderEndpointName(endpoint.apiSettingId)}
                              </TableCell>
                              <TableCell>
                                {endpoint.customParameters ? (
                                  <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded max-w-md overflow-auto">
                                    {JSON.stringify(endpoint.customParameters, null, 2)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No custom parameters</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-800"
                                    onClick={() => onRunEndpoint(endpoint, endpoint.apiSettingId ? renderEndpointName(endpoint.apiSettingId) : 'Unknown Endpoint')}
                                    title="Run endpoint"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-800"
                                    onClick={() => onDeleteEndpoint(endpoint.id)}
                                    title="Delete endpoint"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md">
                      <Terminal className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No API endpoints configured</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Usage Data Tab */}
              {product.product?.apiIdentifier === '145' && (
                <TabsContent value="usage">
                  <UsageDataTab userProduct={product} />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="destructive" size="sm" onClick={() => onDelete(product)}>
              <Trash className="h-4 w-4 mr-1" />
              Remove Product
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}