import { useState, useEffect } from "react";
import { useParams } from "wouter";
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
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash, 
  RefreshCw,
  ArrowLeft, 
  Terminal,
  Link as LinkIcon
} from "lucide-react";

interface UserProductWithDetails extends UserProduct {
  product?: Product;
  endpoints?: UserProductEndpoint[];
}

export default function UserProductsPage() {
  // Get userId from URL
  const params = useParams();
  const userId = params.userId ? parseInt(params.userId) : null;
  
  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddEndpointDialogOpen, setIsAddEndpointDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UserProductWithDetails | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    username: '',
    msisdn: '',
    status: 'pending',
    comments: ''
  });
  const [endpointFormData, setEndpointFormData] = useState({
    apiSettingId: '',
    customParameters: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: () => getQueryFn<User>({ on401: "returnNull" })(`/api/users/${userId}`),
    enabled: !!userId,
    retry: 1,
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch user details. Please try again.",
        variant: "destructive"
      });
      console.error("Error fetching user:", error);
    }
  });

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
    queryFn: () => getQueryFn<UserProductWithDetails[]>({ on401: "returnNull" })(`/api/user-products/${userId}`),
    enabled: !!userId
  });

  // Mutations
  const createUserProductMutation = useMutation({
    mutationFn: async (data: typeof formData & { userId: number }) => {
      const payload = {
        userId: data.userId,
        productId: parseInt(data.productId),
        username: data.username || null,
        msisdn: data.msisdn || null,
        status: data.status,
        comments: data.comments || null
      };
      return apiRequest('/api/user-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', userId] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Product assigned",
        description: "The product has been successfully assigned to the user.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign product. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteUserProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/user-products/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', userId] });
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
    mutationFn: async (data: { userProductId: number, apiSettingId: number, customParameters?: string }) => {
      const payload = {
        userProductId: data.userProductId,
        apiSettingId: data.apiSettingId,
        customParameters: data.customParameters ? JSON.parse(data.customParameters) : null
      };
      return apiRequest('/api/user-products/' + data.userProductId + '/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', userId] });
      setIsAddEndpointDialogOpen(false);
      setEndpointFormData({
        apiSettingId: '',
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
      return apiRequest(`/api/user-products/endpoints/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', userId] });
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
    if (selectedProduct && endpointFormData.apiSettingId) {
      addEndpointMutation.mutate({
        userProductId: selectedProduct.id,
        apiSettingId: parseInt(endpointFormData.apiSettingId),
        customParameters: endpointFormData.customParameters || undefined
      });
    }
  };

  const handleDeleteEndpoint = (endpointId: number) => {
    deleteEndpointMutation.mutate(endpointId);
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

  if (userLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center p-10">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted-foreground mb-6">The requested user could not be found.</p>
          <Button variant="outline" onClick={() => window.location.href = '/admin/user-management'}>
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
            onClick={() => window.location.href = '/admin/user-management'}
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
          <Button onClick={openAddDialog}>
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
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'active')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
          />
        </TabsContent>
        
        <TabsContent value="pending">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'pending')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
          />
        </TabsContent>
        
        <TabsContent value="issue">
          <UserProductsList 
            userProducts={userProducts.filter((p) => p.status === 'suspended' || p.status === 'cancelled')} 
            isLoading={userProductsLoading}
            onDelete={openDeleteDialog}
            onAddEndpoint={openAddEndpointDialog}
            onDeleteEndpoint={handleDeleteEndpoint}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
            renderEndpointName={renderEndpointName}
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
    </div>
  );
}

interface UserProductsListProps {
  userProducts: UserProductWithDetails[];
  isLoading: boolean;
  onDelete: (userProduct: UserProductWithDetails) => void;
  onAddEndpoint: (userProduct: UserProductWithDetails) => void;
  onDeleteEndpoint: (endpointId: number) => void;
  renderProductName: (productId: number) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
  renderEndpointName: (apiSettingId: number) => string;
}

function UserProductsList({ 
  userProducts,
  isLoading,
  onDelete,
  onAddEndpoint,
  onDeleteEndpoint,
  renderProductName,
  renderStatusBadge,
  renderEndpointName
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
      <div className="flex flex-col items-center justify-center p-10">
        <div className="rounded-full bg-yellow-100 p-3 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p className="text-center text-muted-foreground">No user products found in this category</p>
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
              <CardDescription>
                Username: {product.username || 'N/A'} | MSISDN: {product.msisdn || 'N/A'}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {renderStatusBadge(product.status)}
              <span className="text-xs text-muted-foreground">
                Created {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {product.comments && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{product.comments}</p>
              </div>
            )}

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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => onDeleteEndpoint(endpoint.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
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