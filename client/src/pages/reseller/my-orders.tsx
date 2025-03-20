import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, TruckIcon, Smartphone } from "lucide-react";
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
  const [activeTab, setActiveTab] = React.useState<string>("all");

  // Fetch orders for current reseller
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    
    if (activeTab === "all") return orders;
    return orders.filter(order => order.status === activeTab);
  }, [orders, activeTab]);

  const renderProvisionDetails = (order: OrderWithDetails) => {
    if (order.provisionMethod === 'courier') {
      return (
        <div className="text-sm mt-2 space-y-1">
          <div className="flex items-center text-neutral-dark">
            <TruckIcon className="mr-2 h-4 w-4" />
            <span>Courier Delivery</span>
          </div>
          {order.address && (
            <p className="ml-6"><span className="font-medium">Address:</span> {order.address}</p>
          )}
          {order.contactName && (
            <p className="ml-6"><span className="font-medium">Contact:</span> {order.contactName}, {order.contactPhone}</p>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-sm mt-2 space-y-1">
          <div className="flex items-center text-neutral-dark">
            <Smartphone className="mr-2 h-4 w-4" />
            <span>Self Provision</span>
          </div>
          {order.simNumber && (
            <p className="ml-6"><span className="font-medium">SIM Number:</span> {order.simNumber}</p>
          )}
        </div>
      );
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-white">Active</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-white">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker mb-6">My Orders</h1>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full mb-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-neutral-dark py-6">No orders found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{order.product?.name || 'Unknown Product'}</CardTitle>
                    {renderStatusBadge(order.status)}
                  </div>
                  <p className="text-sm text-neutral-dark">
                    Order #{order.id} • Ordered on {formatDate(new Date(order.createdAt))}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Price:</span>
                      <span>{order.product ? formatCurrency(parseFloat(order.product.basePrice)) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-dark">Client:</span>
                      <span>{order.client?.name || '—'}</span>
                    </div>
                  </div>

                  {renderProvisionDetails(order)}

                  {order.status === 'rejected' && order.rejectionReason && (
                    <div className="mt-4 p-3 border border-destructive/20 bg-destructive/10 rounded-md">
                      <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm mt-1">{order.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}