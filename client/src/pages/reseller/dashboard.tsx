import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ClientTable } from "@/components/dashboard/client-table";
import { ProductCard } from "@/components/dashboard/product-card";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getPriceByResellerGroup } from "@/lib/utils";
import { Product } from "@shared/schema";
import { Link } from "wouter";
import { User, Wifi, ShoppingCart } from "lucide-react";

export default function ResellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const resellerGroup = user?.resellerGroup || 1;

  // Fetch stats for the dashboard
  const { data: stats } = useQuery({
    queryKey: ['/api/reseller/stats'],
  });

  // Fetch client summaries
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch available products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const handlePurchaseProduct = (product: Product) => {
    toast({
      title: "Product Selection",
      description: `You've selected ${product.name}. Please choose a client to assign it to.`,
    });
    // Navigate to purchase flow or open a modal
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker">Reseller Dashboard</h1>

        {/* Credit Balance / Payment Mode Card */}
        <Card className="my-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h2 className="text-lg font-medium text-neutral-darker">
                  {user?.paymentMode === 'credit' ? 'Available Credit Balance' : 'Payment Mode'}
                </h2>
                <p className="text-sm text-neutral-dark mt-1">
                  {user?.paymentMode === 'credit' 
                    ? 'Use your credit to purchase products for clients'
                    : 'Your account is configured for automatic debit order payments'
                  }
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                {user?.paymentMode === 'credit' ? (
                  <div className="text-3xl font-bold text-primary">
                    {user?.creditBalance 
                      ? formatCurrency(parseFloat(user.creditBalance.toString())) 
                      : 'R 0.00'
                    }
                  </div>
                ) : (
                  <div className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    Debit Order
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6">
              {user?.paymentMode === 'credit' && (
                <Button>
                  Add Credit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Active Clients"
            value={stats?.activeClients || "0"}
            icon={<User className="h-5 w-5" />}
            linkText="View all"
            linkUrl="/reseller/clients"
          />
          
          <StatCard
            title="Active SIMs"
            value={stats?.activeSims || "0"}
            icon={<Wifi className="h-5 w-5" />}
            linkText="View details"
            linkUrl="/reseller/clients"
            iconBgColor="bg-success"
          />
          
          <StatCard
            title="Monthly Revenue"
            value={stats?.monthlyRevenue || "R 0.00"}
            icon={<ShoppingCart className="h-5 w-5" />}
            linkText="View report"
            linkUrl="/reseller/billing"
            iconBgColor="bg-warning"
          />
        </div>

        {/* Active Clients */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-darker">Active Clients</h2>
            <Link href="/reseller/clients/new">
              <Button>
                Add Client
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            {isLoadingClients ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ClientTable
                clients={clients || []}
              />
            )}
          </div>
        </div>

        {/* Available Products */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-neutral-darker">Available Products</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoadingProducts ? (
              <div className="col-span-3 flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              products?.slice(0, 3).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  resellerPrice={getPriceByResellerGroup(product, resellerGroup)}
                  onPurchase={handlePurchaseProduct}
                />
              ))
            )}
            {products && products.length > 3 && (
              <div className="col-span-3 mt-4 text-center">
                <Link href="/reseller/products">
                  <Button variant="outline">
                    View All Products
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
