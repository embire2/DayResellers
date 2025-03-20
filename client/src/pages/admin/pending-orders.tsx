import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

// Schema for order action (approve/reject)
const orderActionSchema = z.object({
  status: z.enum(['active', 'rejected']),
  rejectionReason: z.string().optional().refine(
    (val, ctx) => {
      if (ctx.data.status === 'rejected' && (!val || val.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: "Rejection reason is required when rejecting an order",
      path: ['rejectionReason']
    }
  ),
});

type OrderWithDetails = {
  id: number;
  resellerId: number;
  clientId: number;
  productId: number;
  status: 'pending' | 'active' | 'rejected';
  provisionMethod: 'courier' | 'self';
  simNumber?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  country?: string;
  rejectionReason?: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    basePrice: string;
  };
  client: {
    id: number;
    name: string;
  };
  reseller: {
    id: number;
    username: string;
  };
};

export default function PendingOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isOrderActionModalOpen, setIsOrderActionModalOpen] = useState(false);

  // Fetch pending orders
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
    enabled: user?.role === 'admin',
  });

  // Filter for pending orders
  const pendingOrders = orders?.filter(order => order.status === 'pending') || [];

  // Form for order action (approve/reject)
  const form = useForm<z.infer<typeof orderActionSchema>>({
    resolver: zodResolver(orderActionSchema),
    defaultValues: {
      status: 'active',
      rejectionReason: '',
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof orderActionSchema>) => {
      if (!selectedOrder) return null;
      
      const res = await apiRequest(
        "PATCH",
        `/api/orders/${selectedOrder.id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setIsOrderActionModalOpen(false);
      form.reset();
      toast({
        title: "Order updated",
        description: "The order status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating order",
        description: error.message || "An error occurred while updating the order",
        variant: "destructive",
      });
    },
  });

  const handleOrderAction = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    form.reset({
      status: 'active',
      rejectionReason: '',
    });
    setIsOrderActionModalOpen(true);
  };

  const onSubmit = (values: z.infer<typeof orderActionSchema>) => {
    updateOrderMutation.mutate(values);
  };

  const renderProvisionDetails = (order: OrderWithDetails) => {
    if (order.provisionMethod === 'courier') {
      return (
        <div className="text-sm mt-2">
          <p><span className="font-medium">Delivery Address:</span> {order.address}</p>
          <p><span className="font-medium">Contact:</span> {order.contactName}, {order.contactPhone}</p>
          <p><span className="font-medium">Country:</span> {order.country || 'South Africa'}</p>
        </div>
      );
    } else {
      return (
        <div className="text-sm mt-2">
          <p><span className="font-medium">SIM Serial Number:</span> {order.simNumber}</p>
        </div>
      );
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-neutral-darker mb-6">Access Denied</h1>
          <Card>
            <CardContent className="pt-6">
              <p>You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">Pending Orders</h1>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-neutral-dark py-6">No pending orders found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-neutral-50 py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{order.product.name}</CardTitle>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Order #:</span>
                      <span>{order.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Price:</span>
                      <span>{formatCurrency(parseFloat(order.product.basePrice))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Reseller:</span>
                      <span>{order.reseller.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Client:</span>
                      <span>{order.client.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Date:</span>
                      <span>{formatDate(new Date(order.createdAt))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Provision Method:</span>
                      <span className="capitalize">{order.provisionMethod}</span>
                    </div>
                  </div>

                  {renderProvisionDetails(order)}

                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => handleOrderAction(order)}>
                      Approve/Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Action Modal */}
        <Dialog open={isOrderActionModalOpen} onOpenChange={setIsOrderActionModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Order Action</DialogTitle>
              <DialogDescription>
                {selectedOrder && (
                  <>Review and take action on order #{selectedOrder.id} for {selectedOrder.product.name}</>
                )}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Action</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="active" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <CheckCircle className="mr-2 h-4 w-4 text-success" />
                              Approve
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="rejected" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center">
                              <XCircle className="mr-2 h-4 w-4 text-destructive" />
                              Reject
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('status') === 'rejected' && (
                  <FormField
                    control={form.control}
                    name="rejectionReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rejection Reason</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide a reason for rejecting this order"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={updateOrderMutation.isPending}
                  >
                    {updateOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit"
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