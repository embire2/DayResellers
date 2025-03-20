import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  product?: {
    id: number;
    name: string;
    basePrice: string;
  };
  client?: {
    id: number;
    name: string;
  };
};

export default function MyOrders() {
  const { user } = useAuth();

  // Fetch orders for the current user
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/reseller', user?.id],
    enabled: !!user?.id,
  });

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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Group orders by status
  const pendingOrders = orders?.filter(order => order.status === 'pending') || [];
  const activeOrders = orders?.filter(order => order.status === 'active') || [];
  const rejectedOrders = orders?.filter(order => order.status === 'rejected') || [];

  if (user?.role !== 'reseller') {
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
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">My Orders</h1>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-neutral-dark py-6">No orders found.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending">
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Orders */}
            <TabsContent value="pending">
              {pendingOrders.length === 0 ? (
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
                          <CardTitle className="text-lg">{order.product?.name}</CardTitle>
                          {renderStatusBadge(order.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Order #:</span>
                            <span>{order.id}</span>
                          </div>
                          {order.product && (
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-dark">Price:</span>
                              <span>{formatCurrency(parseFloat(order.product.basePrice))}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Client:</span>
                            <span>{order.client?.name}</span>
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
                        
                        <div className="flex justify-between mt-4">
                          <div className="text-xs text-neutral-dark">
                            <p>Awaiting admin approval</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Active Orders */}
            <TabsContent value="active">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-neutral-dark py-6">No active orders found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {activeOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-neutral-50 py-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{order.product?.name}</CardTitle>
                          {renderStatusBadge(order.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Order #:</span>
                            <span>{order.id}</span>
                          </div>
                          {order.product && (
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-dark">Price:</span>
                              <span>{formatCurrency(parseFloat(order.product.basePrice))}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Client:</span>
                            <span>{order.client?.name}</span>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rejected Orders */}
            <TabsContent value="rejected">
              {rejectedOrders.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-neutral-dark py-6">No rejected orders found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {rejectedOrders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="bg-neutral-50 py-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{order.product?.name}</CardTitle>
                          {renderStatusBadge(order.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Order #:</span>
                            <span>{order.id}</span>
                          </div>
                          {order.product && (
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-dark">Price:</span>
                              <span>{formatCurrency(parseFloat(order.product.basePrice))}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-dark">Client:</span>
                            <span>{order.client?.name}</span>
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
                        
                        {order.rejectionReason && (
                          <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                            <h4 className="text-sm font-medium mb-1">Rejection Reason:</h4>
                            <p className="text-sm">{order.rejectionReason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}