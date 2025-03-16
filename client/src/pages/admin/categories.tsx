import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ProductCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MasterCategory } from "@shared/types";

// Form schema for category management
const categoryFormSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
  description: z.string().optional(),
  masterCategory: z.enum(["MTN Fixed", "MTN GSM"]),
  parentId: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// Helper function to ensure boolean type for isActive
const ensureBoolean = (value: boolean | null | undefined): boolean => {
  return value === null || value === undefined ? true : value;
};

export default function Categories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<ProductCategory[]>({ 
    queryKey: ['/api/product-categories'],
    throwOnError: true,
  });

  // Form for adding new categories
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      masterCategory: "MTN Fixed",
      isActive: true,
      parentId: null,
    },
  });

  // Form for editing categories
  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      masterCategory: "MTN Fixed",
      isActive: true,
      parentId: null,
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest('/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({
        title: "Category created",
        description: "The category has been created successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create category: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/product-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update category: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/product-categories/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
      setIsDeleteAlertOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete category: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new category
  const onSubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };

  // Handle form submission for editing a category
  const onEditSubmit = (data: CategoryFormValues) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({ ...data, id: selectedCategory.id });
    }
  };

  // Open edit dialog and populate form with category data
  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      description: category.description || "",
      masterCategory: category.masterCategory as MasterCategory,
      isActive: category.isActive === null ? true : category.isActive,
      parentId: category.parentId || null,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDelete = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDeleteAlertOpen(true);
  };

  // Check if a category is a parent (has subcategories)
  const hasSubcategories = (categoryId: number) => {
    return categories.some((category: ProductCategory) => category.parentId === categoryId);
  };

  // Get parent category name
  const getParentCategoryName = (parentId: number | null) => {
    if (!parentId) return "None";
    const parent = categories.find((category: ProductCategory) => category.id === parentId);
    return parent ? parent.name : "Unknown";
  };

  // Filter top-level categories (no parent)
  const topLevelCategories = categories.filter((category: ProductCategory) => !category.parentId);

  // Get subcategories for a specific parent
  const getSubcategories = (parentId: number) => {
    return categories.filter((category: ProductCategory) => category.parentId === parentId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new product category or subcategory.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Category name" {...field} />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Category description" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="masterCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select master category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MTN Fixed">MTN Fixed</SelectItem>
                          <SelectItem value="MTN GSM">MTN GSM</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)} 
                        defaultValue={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None (Top Level)</SelectItem>
                          {topLevelCategories.map((category: ProductCategory) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        If this is a subcategory, select its parent.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Whether this category is active and visible
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createCategoryMutation.isPending}>
                    {createCategoryMutation.isPending ? "Saving..." : "Save Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ) : topLevelCategories.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-neutral-dark">No categories found. Create a new category to get started.</p>
            </CardContent>
          </Card>
        ) : (
          topLevelCategories.map((category: ProductCategory) => (
            <Card key={category.id} className={!category.isActive ? "opacity-70" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.description || "No description"}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(category)}
                      disabled={hasSubcategories(category.id)}
                      title={hasSubcategories(category.id) ? "Delete subcategories first" : "Delete category"}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    {category.masterCategory}
                  </span>
                  {!category.isActive && (
                    <span className="text-sm bg-destructive/10 text-destructive px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </CardHeader>
              
              {hasSubcategories(category.id) && (
                <CardContent>
                  <h3 className="font-medium mb-2">Subcategories</h3>
                  <div className="space-y-4">
                    {getSubcategories(category.id).map((subcategory: ProductCategory) => (
                      <div 
                        key={subcategory.id} 
                        className={`p-4 border rounded-md ${!subcategory.isActive ? "opacity-70" : ""}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{subcategory.name}</h4>
                            <p className="text-sm text-neutral-dark">
                              {subcategory.description || "No description"}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(subcategory)}>
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDelete(subcategory)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {subcategory.masterCategory}
                          </span>
                          {!subcategory.isActive && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              <CardFooter className="text-sm text-neutral-dark">
                Created: {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : "N/A"}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Category description" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="masterCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Master Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select master category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MTN Fixed">MTN Fixed</SelectItem>
                        <SelectItem value="MTN GSM">MTN GSM</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value && value !== "none" ? Number(value) : null)} 
                      defaultValue={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {topLevelCategories
                          .filter((c: ProductCategory) => c.id !== selectedCategory?.id)
                          .map((category: ProductCategory) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      If this is a subcategory, select its parent.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Whether this category is active and visible
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? "Saving..." : "Update Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{selectedCategory?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCategory && deleteCategoryMutation.mutate(selectedCategory.id)}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}