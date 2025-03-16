import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Product, UserProduct } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function ManageUserProducts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUserProduct, setSelectedUserProduct] = useState<UserProduct | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    productId: '',
    username: '',
    msisdn: '',
    status: 'pending',
    comments: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data.filter((u: User) => u.role === 'reseller')
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  const { data: userProducts = [], isLoading: userProductsLoading, refetch: refetchUserProducts } = useQuery({
    queryKey: ['/api/user-products'],
    queryFn: getQueryFn({ on401: "returnNull" })
  });

  // Mutations
  const createUserProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('/api/user-products', {
        method: 'POST',
        body: JSON.stringify({
          userId: parseInt(data.userId),
          productId: parseInt(data.productId),
          username: data.username || null,
          msisdn: data.msisdn || null,
          status: data.status,
          comments: data.comments || null
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products'] });
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

  const updateUserProductMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: number }) => {
      return apiRequest(`/api/user-products/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: data.username || null,
          msisdn: data.msisdn || null,
          status: data.status,
          comments: data.comments || null
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Product updated",
        description: "The user product has been successfully updated.",
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

  const deleteUserProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/user-products/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-products'] });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      productId: '',
      username: '',
      msisdn: '',
      status: 'pending',
      comments: ''
    });
    setSelectedUserProduct(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (userProduct: UserProduct) => {
    setSelectedUserProduct(userProduct);
    setFormData({
      userId: userProduct.userId.toString(),
      productId: userProduct.productId.toString(),
      username: userProduct.username || '',
      msisdn: userProduct.msisdn || '',
      status: userProduct.status,
      comments: userProduct.comments || ''
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (userProduct: UserProduct) => {
    setSelectedUserProduct(userProduct);
    setIsDeleteDialogOpen(true);
  };

  const handleAdd = () => {
    createUserProductMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (selectedUserProduct) {
      updateUserProductMutation.mutate({
        ...formData,
        id: selectedUserProduct.id
      });
    }
  };

  const handleDelete = () => {
    if (selectedUserProduct) {
      deleteUserProductMutation.mutate(selectedUserProduct.id);
    }
  };

  const renderUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.username : 'Unknown User';
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

  if (usersLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage User Products</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => refetchUserProducts()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Product
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
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            renderUserName={renderUserName}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="active">
          <UserProductsList 
            userProducts={userProducts.filter((p: UserProduct) => p.status === 'active')} 
            isLoading={userProductsLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            renderUserName={renderUserName}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="pending">
          <UserProductsList 
            userProducts={userProducts.filter((p: UserProduct) => p.status === 'pending')} 
            isLoading={userProductsLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            renderUserName={renderUserName}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="issue">
          <UserProductsList 
            userProducts={userProducts.filter((p: UserProduct) => p.status === 'suspended' || p.status === 'cancelled')} 
            isLoading={userProductsLoading}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
            renderUserName={renderUserName}
            renderProductName={renderProductName}
            renderStatusBadge={renderStatusBadge}
          />
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Product to User</DialogTitle>
            <DialogDescription>
              Assign a product to a reseller. The reseller will be able to access the product after approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userId" className="text-right">
                Reseller
              </Label>
              <div className="col-span-3">
                <Select name="userId" value={formData.userId} onValueChange={(value) => handleSelectChange('userId', value)}>
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
            </div>
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
            <Button type="button" onClick={handleAdd} disabled={createUserProductMutation.isPending || !formData.userId || !formData.productId}>
              {createUserProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User Product</DialogTitle>
            <DialogDescription>
              Update the product assignment details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editUserId" className="text-right">
                Reseller
              </Label>
              <div className="col-span-3">
                <Input
                  id="editUserId"
                  value={renderUserName(parseInt(formData.userId))}
                  disabled
                  className="col-span-3 bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editProductId" className="text-right">
                Product
              </Label>
              <div className="col-span-3">
                <Input
                  id="editProductId"
                  value={renderProductName(parseInt(formData.productId))}
                  disabled
                  className="col-span-3 bg-muted"
                />
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
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEdit} disabled={updateUserProductMutation.isPending}>
              {updateUserProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the product from the user. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteUserProductMutation.isPending}>
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
  userProducts: any[];
  isLoading: boolean;
  onEdit: (userProduct: UserProduct) => void;
  onDelete: (userProduct: UserProduct) => void;
  renderUserName: (userId: number) => string;
  renderProductName: (productId: number) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

function UserProductsList({ 
  userProducts,
  isLoading,
  onEdit,
  onDelete,
  renderUserName,
  renderProductName,
  renderStatusBadge
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
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-center text-muted-foreground">No user products found in this category</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border mt-4">
      <Table>
        <TableCaption>Manage product assignments for resellers</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Reseller</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>MSISDN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userProducts.map((product: UserProduct) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{renderUserName(product.userId)}</TableCell>
              <TableCell>{renderProductName(product.productId)}</TableCell>
              <TableCell>{product.username || 'N/A'}</TableCell>
              <TableCell>{product.msisdn || 'N/A'}</TableCell>
              <TableCell>{renderStatusBadge(product.status)}</TableCell>
              <TableCell>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(product)}
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
  );
}