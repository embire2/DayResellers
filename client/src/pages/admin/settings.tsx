import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { MasterCategory, ProductCategory, insertProductCategorySchema, Product } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Edit, Pencil, Plus, Trash2, Settings as SettingsIcon, Tag } from "lucide-react";

// Form schemas
const categoryFormSchema = insertProductCategorySchema.extend({
  id: z.number().optional(),
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Queries
  const { data: productCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/product-categories"],
    enabled: user?.role === "admin",
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof categoryFormSchema>>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      masterCategory: "MTN Fixed",
      description: "",
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categoryFormSchema>) => {
      const res = await apiRequest("POST", "/api/product-categories", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "The category has been created successfully",
      });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categoryFormSchema>) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/product-categories/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "The category has been updated successfully",
      });
      setCategoryDialogOpen(false);
      setSelectedCategory(null);
      categoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/product-categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleAddCategory = () => {
    setSelectedCategory(null);
    categoryForm.reset({
      name: "",
      masterCategory: "MTN Fixed",
      description: "",
    });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setSelectedCategory(category);
    categoryForm.reset({
      id: category.id,
      name: category.name,
      masterCategory: category.masterCategory as MasterCategory,
      description: category.description || "",
    });
    setCategoryDialogOpen(true);
  };

  const onCategoryFormSubmit = (data: z.infer<typeof categoryFormSchema>) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate(data);
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="container py-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Settings</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Settings</h1>
            <p className="text-neutral mt-1">
              Manage system-wide settings for the OpenWeb Reseller Platform
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories" className="flex items-center gap-1">
              <Tag size={16} />
              <span>Product Categories</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1">
              <SettingsIcon size={16} />
              <span>System Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-semibold">Product Categories</h2>
              <Button onClick={handleAddCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productCategories.map((category: ProductCategory) => (
                <Card key={category.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
                      <CardDescription>{category.masterCategory}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-dark">
                      {category.description || "No description provided"}
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-neutral">
                    Created on {formatDate(category.createdAt)}
                  </CardFooter>
                </Card>
              ))}

              {productCategories.length === 0 && !categoriesLoading && (
                <Card className="col-span-full bg-muted/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-center text-neutral-dark mb-4">
                      No product categories found
                    </p>
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings for the OpenWeb Reseller Platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-dark">System settings will be added in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                {selectedCategory
                  ? "Update the details of this product category"
                  : "Create a new product category to organize your products"}
              </DialogDescription>
            </DialogHeader>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onCategoryFormSubmit)} className="space-y-4">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Fixed LTE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="masterCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a master category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MTN Fixed">MTN Fixed</SelectItem>
                          <SelectItem value="MTN GSM">MTN GSM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This groups products by their API integration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter a description for this category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCategoryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                      <>Saving...</>
                    ) : selectedCategory ? (
                      <>Update Category</>
                    ) : (
                      <>Create Category</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}