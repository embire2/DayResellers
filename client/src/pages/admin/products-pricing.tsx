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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductTable } from "@/components/dashboard/product-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Product, ProductCategory, insertProductSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Product form schema
const productFormSchema = insertProductSchema
  .omit({ categoryId: true })
  .extend({
    categoryId: z.string().min(1, "Category is required"),
    status: z.enum(["active", "limited", "outofstock"]),
    apiIdentifier: z.string().max(3, "API identifier must be 3 digits maximum").optional(),
  });

export default function ProductsPricing() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'MTN Fixed' | 'MTN GSM'>('MTN Fixed');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories', activeCategory],
    queryFn: async () => {
      const response = await fetch(`/api/product-categories/${activeCategory}`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products', activeCategory],
    queryFn: async () => {
      const response = await fetch(`/api/products/${activeCategory}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
  });

  // Product form
  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: "",
      group1Price: "",
      group2Price: "",
      categoryId: "",
      status: "active",
      apiEndpoint: "",
      apiIdentifier: "",
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema>) => {
      const formattedData = {
        ...data,
        categoryId: parseInt(data.categoryId),
      };
      const response = await apiRequest<Response>("POST", "/api/products", formattedData);
      return response.json();
    },
    onSuccess: (data: Product) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', activeCategory] });
      setIsProductModalOpen(false);
      form.reset();
      toast({
        title: "Product created",
        description: `New product "${data.name}" has been successfully created`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: z.infer<typeof productFormSchema> & { id: number }) => {
      const { id, ...productData } = data;
      const formattedData = {
        ...productData,
        categoryId: parseInt(productData.categoryId),
      };
      const response = await apiRequest<Response>("PUT", `/api/products/${id}`, formattedData);
      return response.json();
    },
    onSuccess: (data: Product) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', activeCategory] });
      setIsProductModalOpen(false);
      setIsEditingProduct(false);
      setSelectedProduct(null);
      form.reset();
      toast({
        title: "Product updated",
        description: `Product "${data.name}" has been successfully updated`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include"
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        return true;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', activeCategory] });
      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof productFormSchema>) => {
    if (isEditingProduct && selectedProduct) {
      updateProductMutation.mutate({ ...values, id: selectedProduct.id });
    } else {
      createProductMutation.mutate(values);
    }
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditingProduct(true);
    
    form.setValue("name", product.name);
    form.setValue("description", product.description || "");
    form.setValue("basePrice", product.basePrice.toString());
    form.setValue("group1Price", product.group1Price.toString());
    form.setValue("group2Price", product.group2Price.toString());
    form.setValue("categoryId", product.categoryId.toString());
    form.setValue("status", product.status as "active" | "limited" | "outofstock");
    form.setValue("apiEndpoint", product.apiEndpoint || "");
    form.setValue("apiIdentifier", product.apiIdentifier || "");
    
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleAddNewClick = () => {
    setIsEditingProduct(false);
    setSelectedProduct(null);
    form.reset({
      name: "",
      description: "",
      basePrice: "",
      group1Price: "",
      group2Price: "",
      categoryId: "",
      status: "active",
      apiEndpoint: "",
      apiIdentifier: "",
    });
    setIsProductModalOpen(true);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-neutral-darker">Products & Pricing</h1>
          <Button onClick={handleAddNewClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Tabs
          defaultValue="MTN Fixed"
          className="mt-6"
          onValueChange={(value) => setActiveCategory(value as 'MTN Fixed' | 'MTN GSM')}
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="MTN Fixed">MTN Fixed</TabsTrigger>
            <TabsTrigger value="MTN GSM">MTN GSM</TabsTrigger>
          </TabsList>

          {['MTN Fixed', 'MTN GSM'].map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle>{category} Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingProducts ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ProductTable
                      products={products || []}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      categories={categories?.reduce((acc, category) => {
                        acc[category.id] = category.name;
                        return acc;
                      }, {} as Record<number, string>)}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Product Modal */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isEditingProduct ? "Edit Product" : "Create New Product"}
              </DialogTitle>
              <DialogDescription>
                {isEditingProduct
                  ? "Update the product details below"
                  : "Add a new product to the catalog"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="resize-none"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (R)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="group1Price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group 1 Price (R)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="group2Price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group 2 Price (R)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            ) : (
                              categories?.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id.toString()}
                                >
                                  {category.name}
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="limited">Limited Stock</SelectItem>
                            <SelectItem value="outofstock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiIdentifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Identifier</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Auto-generated for new products"
                            className="font-mono"
                            maxLength={3}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>
                          {isEditingProduct ? "Edit the 3-digit API identifier code" : "Leave blank to auto-generate a 3-digit code"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="apiEndpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Endpoint</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="/api/packages/example"
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={
                      createProductMutation.isPending ||
                      updateProductMutation.isPending
                    }
                  >
                    {(createProductMutation.isPending || updateProductMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditingProduct ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      isEditingProduct ? "Update Product" : "Create Product"
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
