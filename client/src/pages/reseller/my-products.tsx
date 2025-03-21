import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import { UserProduct, Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, Info, BarChart, LinkIcon, Terminal } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";

// Import the UsageDataTab component
import { UsageDataTab } from "@/components/user-products/usage-data-tab";

// Define the extended UserProduct type with product relation
interface UserProductWithProduct extends UserProduct {
  product: Product;
  endpoints?: Array<{
    id: number;
    apiSetting?: {
      name: string;
    }
  }>;
}

export default function MyProducts() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<UserProductWithProduct | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Enhanced authentication check
  React.useEffect(() => {
    if (user) {
      console.log("User authenticated in MyProducts:", {
        userId: user.id,
        username: user.username,
        role: user.role,
        isAuthenticated: true
      });
    } else {
      console.warn("No authenticated user in MyProducts");
    }
  }, [user]);

  // Query for user products with enhanced error handling and debugging
  const { data: userProducts = [], isLoading: userProductsLoading, error: userProductsError, refetch: refetchUserProducts } = useQuery<UserProductWithProduct[]>({
    queryKey: [`/api/user-products/${user?.id}`],
    queryFn: async ({ queryKey }) => {
      // Enhanced custom query function with extra logging
      const url = queryKey[0] as string;
      console.log(`Making direct fetch request to: ${url}`);
      
      try {
        const res = await fetch(url, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });
        
        console.log(`User products API response:`, {
          status: res.status,
          statusText: res.statusText,
          url: url
        });

        if (res.status === 401) {
          console.error(`Authentication error for user products (user ${user?.id})`);
          return [];
        }

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Error fetching user products: ${errorText}`);
          throw new Error(`${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log(`Successfully retrieved user products:`, {
          count: Array.isArray(data) ? data.length : 'not an array',
          data: data
        });
        return data;
      } catch (error) {
        console.error(`Exception in user products fetch:`, error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1
  });
  
  // Log product data on each render for debugging
  React.useEffect(() => {
    if (userProducts && userProducts.length > 0) {
      console.log("Products available for display:", { 
        userId: user?.id,
        productCount: userProducts.length,
        products: userProducts 
      });
    } else {
      console.log("No products available for display", {
        userId: user?.id,
        isLoading: userProductsLoading,
        hasError: !!userProductsError
      });
    }
    
    if (userProductsError) {
      console.error("Error in products query:", { 
        userId: user?.id, 
        error: userProductsError 
      });
    }
  }, [userProducts, userProductsLoading, userProductsError, user?.id]);

  // Status rendering is handled within each component where needed

  const showProductDetails = (product: UserProductWithProduct) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Products</h1>
        <Button
          variant="outline"
          onClick={() => refetchUserProducts()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled/Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderProductsTable(userProducts, userProductsLoading, showProductDetails)}
        </TabsContent>
        
        <TabsContent value="active">
          {renderProductsTable(
            userProducts.filter((p) => p.status === 'active'),
            userProductsLoading,
            showProductDetails
          )}
        </TabsContent>
        
        <TabsContent value="pending">
          {renderProductsTable(
            userProducts.filter((p) => p.status === 'pending'),
            userProductsLoading,
            showProductDetails
          )}
        </TabsContent>
        
        <TabsContent value="cancelled">
          {renderProductsTable(
            userProducts.filter((p) => p.status === 'cancelled' || p.status === 'suspended'),
            userProductsLoading,
            showProductDetails
          )}
        </TabsContent>
      </Tabs>

      {/* Product Details Dialog */}
      {selectedProduct && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedProduct.product?.name}</DialogTitle>
              <DialogDescription>
                Product details and usage information
              </DialogDescription>
            </DialogHeader>
            
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
                {selectedProduct.product?.apiIdentifier === '145' && (
                  <TabsTrigger value="usage">
                    <div className="flex items-center">
                      <BarChart className="h-4 w-4 mr-2" />
                      Usage Data
                    </div>
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="details">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium">Status</h3>
                      <div>
                        {(() => {
                          switch (selectedProduct.status) {
                            case "active": return <Badge className="bg-green-500">{selectedProduct.status}</Badge>;
                            case "pending": return <Badge className="bg-yellow-500">{selectedProduct.status}</Badge>;
                            case "suspended": return <Badge className="bg-orange-500">{selectedProduct.status}</Badge>;
                            case "cancelled": return <Badge className="bg-red-500">{selectedProduct.status}</Badge>;
                            default: return <Badge>{selectedProduct.status}</Badge>;
                          }
                        })()}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Username</h3>
                      <p>{selectedProduct.username || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">MSISDN</h3>
                      <p>{selectedProduct.msisdn || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Created</h3>
                      <p>{selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  {selectedProduct.product && (
                    <div className="space-y-2 mt-4">
                      <h3 className="text-sm font-medium">Product Details</h3>
                      <div className="rounded-md bg-secondary p-3">
                        <p><strong>Description:</strong> {selectedProduct.product.description}</p>
                        <p><strong>Category:</strong> {selectedProduct.product.categoryId}</p>
                        <p><strong>API Endpoint:</strong> {selectedProduct.product.apiEndpoint || 'N/A'}</p>
                        <p className="mt-2"><strong>Payment Method:</strong> {user?.paymentMode === 'credit' ? 'Credit Balance' : 'Debit Order'}</p>
                      </div>
                    </div>
                  )}

                  {selectedProduct.comments && (
                    <div className="space-y-2 mt-4">
                      <h3 className="text-sm font-medium">Comments</h3>
                      <div className="rounded-md bg-secondary p-3">
                        <p>{selectedProduct.comments}</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="endpoints">
                {selectedProduct.endpoints && selectedProduct.endpoints.length > 0 ? (
                  <div className="space-y-2">
                    <div className="rounded-md bg-secondary p-3">
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedProduct.endpoints.map((endpoint: any) => (
                          <li key={endpoint.id}>
                            {endpoint.apiSetting?.name || 'Unknown Endpoint'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md">
                    <Terminal className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No API endpoints configured</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Usage Data Tab - Only displayed for products with API identifier 145 */}
              {selectedProduct.product?.apiIdentifier === '145' && (
                <TabsContent value="usage">
                  <UsageDataTab userProduct={selectedProduct} />
                </TabsContent>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function renderProductsTable(
  products: UserProductWithProduct[] | unknown,
  isLoading: boolean,
  onViewDetails: (product: UserProductWithProduct) => void
) {
  const productArray = products as UserProductWithProduct[];
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!productArray || productArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-center text-muted-foreground">No products found in this category</p>
      </div>
    );
  }

  // Function to render status badges within this scope
  const statusBadgeRenderer = (status: string) => {
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

  return (
    <div className="rounded-md border mt-4">
      <Table>
        <TableCaption>Your product subscriptions</TableCaption>
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
          {productArray.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.product?.name || 'Unknown'}</TableCell>
              <TableCell>{product.username || 'N/A'}</TableCell>
              <TableCell>{product.msisdn || 'N/A'}</TableCell>
              <TableCell>
                {statusBadgeRenderer(product.status)}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(product)}
                >
                  <Info className="h-4 w-4 mr-2" />
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}