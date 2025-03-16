import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { UserProduct, Product, InsertUserProduct, User, ApiSetting } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the form schema
const formSchema = z.object({
  userId: z.number().int().positive(),
  productId: z.number().int().positive(),
  username: z.string().optional(),
  msisdn: z.string().optional(),
  comments: z.string().optional(),
  status: z.enum(["active", "pending", "suspended", "cancelled"]).default("active"),
});

export default function ManageUserProducts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Query for users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
    select: (data) => data.filter((u: User) => u.role === 'reseller')
  });

  // Query for products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user
  });

  // Query for API settings
  const { data: apiSettings = [], isLoading: apiSettingsLoading } = useQuery({
    queryKey: ['/api/api-settings'],
    enabled: !!user && user.role === 'admin'
  });

  // Query for user products
  const { data: userProducts = [], isLoading: userProductsLoading, refetch: refetchUserProducts } = useQuery({
    queryKey: ['/api/user-products', selectedUser?.id],
    queryFn: getQueryFn({
      on401: "returnNull",
    }),
    enabled: !!selectedUser?.id
  });

  // Form for creating new user product
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: selectedUser?.id || 0,
      status: "active",
    },
  });

  // Update userId when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      form.setValue('userId', selectedUser.id);
    }
  }, [selectedUser, form]);

  // Create user product mutation
  const createUserProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest('/api/user-products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User product created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      refetchUserProducts();
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', selectedUser?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create user product: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update user product status mutation
  const updateUserProductMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/user-products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User product status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', selectedUser?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user product status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete user product mutation
  const deleteUserProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/user-products/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User product deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-products', selectedUser?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user product: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: z.infer<typeof formSchema>) => {
    createUserProductMutation.mutate(data);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateUserProductMutation.mutate({ id, status });
  };

  const handleDeleteUserProduct = (id: number) => {
    if (window.confirm("Are you sure you want to delete this user product?")) {
      deleteUserProductMutation.mutate(id);
    }
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage User Products</h1>
        <Button
          variant="outline"
          onClick={() => refetchUserProducts()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Select Reseller</CardTitle>
            <CardDescription>
              Select a reseller to manage their products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground">No resellers found</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="user">Reseller</Label>
                <Select
                  value={selectedUser?.id?.toString() || ""}
                  onValueChange={(value) => {
                    const user = users.find((u: User) => u.id === parseInt(value));
                    setSelectedUser(user || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reseller" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={!selectedUser}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Product
            </Button>
          </CardFooter>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>User Products</CardTitle>
            <CardDescription>
              {selectedUser
                ? `Manage products for ${selectedUser.username}`
                : "Select a reseller to view their products"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <p className="text-center text-muted-foreground">Please select a reseller to view their products</p>
              </div>
            ) : userProductsLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : userProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <p className="text-center text-muted-foreground">No products found for this reseller</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Product
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableCaption>List of products assigned to {selectedUser.username}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>MSISDN</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProducts.map((userProduct: UserProduct & { product: Product }) => (
                      <TableRow key={userProduct.id}>
                        <TableCell className="font-medium">{userProduct.product?.name || 'Unknown'}</TableCell>
                        <TableCell>{userProduct.username || 'N/A'}</TableCell>
                        <TableCell>{userProduct.msisdn || 'N/A'}</TableCell>
                        <TableCell>{renderStatusBadge(userProduct.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Select
                              value={userProduct.status}
                              onValueChange={(value) => handleStatusChange(userProduct.id, value)}
                            >
                              <SelectTrigger className="w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUserProduct(userProduct.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product for {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              Assign a product to this reseller.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Username for the service" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="msisdn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MSISDN</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Mobile number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} placeholder="Additional information" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createUserProductMutation.isPending}>
                  {createUserProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}