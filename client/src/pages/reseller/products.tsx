import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProductCard } from "@/components/dashboard/product-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getPriceByResellerGroup, calculateProRataPrice, formatCurrency } from "@/lib/utils";
import { Product, Client } from "@shared/schema";
import { Search, Loader2 } from "lucide-react";

// Client product form schema
const clientProductSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  productId: z.number(),
  provisionMethod: z.enum(['courier', 'self']),
  // Fields for courier delivery
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  country: z.string().default('South Africa'),
  // Field for self-provision
  simNumber: z.string().optional(),
}).refine(data => {
  // If courier is selected, validate courier fields
  if (data.provisionMethod === 'courier') {
    return !!data.address && !!data.contactName && !!data.contactPhone;
  }
  // If self-provision is selected, validate simNumber
  if (data.provisionMethod === 'self') {
    return !!data.simNumber;
  }
  return false;
}, {
  message: "Please fill all required fields for the selected provision method",
  path: ["provisionMethod"],
});

export default function Products() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'MTN Fixed' | 'MTN GSM'>('MTN Fixed');
  const [searchQuery, setSearchQuery] = useState("");
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const resellerGroup = user?.resellerGroup || 1;

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products', activeCategory],
  });

  // Fetch clients for the client dropdown
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const [provisionMethod, setProvisionMethod] = useState<'courier' | 'self' | null>(null);

  // Purchase product form
  const form = useForm<z.infer<typeof clientProductSchema>>({
    resolver: zodResolver(clientProductSchema),
    defaultValues: {
      clientId: "",
      productId: 0,
      provisionMethod: 'courier',
      address: '',
      contactName: '',
      contactPhone: '',
      country: 'South Africa',
      simNumber: '',
    },
  });

  // Watch for provision method changes to conditionally show form fields
  const watchProvisionMethod = form.watch('provisionMethod');
  
  // Set the provision method when it changes in the form
  React.useEffect(() => {
    if (watchProvisionMethod) {
      setProvisionMethod(watchProvisionMethod);
    }
  }, [watchProvisionMethod]);

  // Purchase product mutation
  const purchaseProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientProductSchema>) => {
      const res = await apiRequest(
        "POST", 
        `/api/orders`,
        { 
          productId: data.productId,
          clientId: parseInt(data.clientId),
          provisionMethod: data.provisionMethod,
          // Include provision method specific fields
          ...(data.provisionMethod === 'courier' ? {
            address: data.address,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
            country: data.country,
          } : {
            simNumber: data.simNumber
          })
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); 
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setIsPurchaseModalOpen(false);
      form.reset();
      toast({
        title: "Order submitted",
        description: user?.paymentMode === 'credit' 
          ? "The product has been successfully purchased" 
          : "Your order has been submitted and is pending approval",
      });
    },
    onError: (error: any) => {
      if (error.message.includes("Insufficient credit balance")) {
        toast({
          title: "Insufficient credit",
          description: user?.paymentMode === 'credit' 
            ? "You don't have enough credit to purchase this product" 
            : "There was an error processing your debit order. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error purchasing product",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Filter products based on search query
  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePurchaseProduct = (product: Product) => {
    setSelectedProduct(product);
    form.setValue("productId", product.id);
    setIsPurchaseModalOpen(true);
  };

  const onSubmit = (values: z.infer<typeof clientProductSchema>) => {
    purchaseProductMutation.mutate(values);
  };

  // Calculate pro-rata pricing
  const getProRataPricing = (product: Product) => {
    if (!product) return null;
    
    const basePrice = getPriceByResellerGroup(product, resellerGroup);
    const { discountPercentage, finalPrice } = calculateProRataPrice(basePrice, new Date());
    
    return {
      originalPrice: basePrice,
      finalPrice,
      discountPercentage
    };
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">Products</h1>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-dark" />
                <Input
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs
                value={activeCategory}
                onValueChange={(value) => setActiveCategory(value as 'MTN Fixed' | 'MTN GSM')}
                className="md:w-80"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="MTN Fixed">MTN Fixed</TabsTrigger>
                  <TabsTrigger value="MTN GSM">MTN GSM</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingProducts ? (
            <div className="col-span-full flex justify-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    resellerPrice={getPriceByResellerGroup(product, resellerGroup)}
                    onPurchase={handlePurchaseProduct}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-10">
                  <p className="text-neutral-dark">No products found{searchQuery ? " matching your search" : ""}</p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Purchase Modal */}
        <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Purchase Product</DialogTitle>
              <DialogDescription>
                Assign {selectedProduct?.name} to a client
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {selectedProduct && (
                  <div className="border rounded-md p-4 mb-4">
                    <h3 className="font-medium mb-2">{selectedProduct.name}</h3>
                    <p className="text-sm text-neutral-dark mb-2">{selectedProduct.description}</p>
                    
                    {/* Payment mode and pricing info */}
                    <div className="mt-2 mb-4">
                      <div className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        Payment Mode: {user?.paymentMode === 'credit' ? 'Credit Balance' : 'Debit Order'}
                      </div>
                    </div>
                    
                    {/* Pro-rata pricing info */}
                    {getProRataPricing(selectedProduct) && (
                      <div className="mt-4 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Original Price:</span>
                          <span>{formatCurrency(getProRataPricing(selectedProduct)!.originalPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center text-success">
                          <span>Pro-rata Discount:</span>
                          <span>{getProRataPricing(selectedProduct)!.discountPercentage}%</span>
                        </div>
                        <div className="flex justify-between items-center font-bold mt-2">
                          <span>Final Price:</span>
                          <span>{formatCurrency(getProRataPricing(selectedProduct)!.finalPrice)}</span>
                        </div>
                        
                        {user?.paymentMode === 'credit' && (
                          <div className="flex justify-between items-center mt-4 text-info">
                            <span>Your Credit Balance:</span>
                            <span>{user?.creditBalance ? formatCurrency(parseFloat(user.creditBalance.toString())) : "R 0.00"}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Client</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingClients ? (
                            <div className="flex justify-center p-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : (
                            clients?.map((client) => (
                              <SelectItem
                                key={client.id}
                                value={client.id.toString()}
                              >
                                {client.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provisionMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="courier">Courier Delivery</SelectItem>
                          <SelectItem value="self">Self Provision</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fields for Courier Delivery */}
                {watchProvisionMethod === 'courier' && (
                  <div className="space-y-4 border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Courier Delivery Details</h3>
                    
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Delivery address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact person name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input disabled value="South Africa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Fields for Self Provision */}
                {watchProvisionMethod === 'self' && (
                  <div className="space-y-4 border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Self Provision Details</h3>
                    
                    <FormField
                      control={form.control}
                      name="simNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SIM Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter SIM serial number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={purchaseProductMutation.isPending}
                  >
                    {purchaseProductMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      user?.paymentMode === 'credit' ? "Purchase with Credit" : "Order with Debit"
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
