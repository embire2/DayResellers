import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductTable } from "@/components/dashboard/product-table";
import { ActivityList, Activity } from "@/components/dashboard/activity-list";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, CreditCard, Wifi } from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'MTN Fixed' | 'MTN GSM'>('MTN Fixed');
  const [, navigate] = useLocation();

  // Fetch stats
  const { data: stats } = useQuery<{
    totalResellers: number;
    monthlyRevenue: string;
    activeSims: number;
  }>({
    queryKey: ['/api/admin/stats'],
  });

  // Fetch products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products', activeCategory],
  });

  // Fetch activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ['/api/admin/activities'],
  });

  const handleEditProduct = (product: Product) => {
    // Navigate to products-pricing page for editing
    navigate("/admin/products-pricing");
  };

  const handleDeleteProduct = (product: Product) => {
    // Navigate to products-pricing page where deletion can be handled
    navigate("/admin/products-pricing");
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-neutral-darker">Admin Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StatCard
            title="Total Resellers"
            value={stats?.totalResellers || 0}
            icon={<Users className="h-5 w-5" />}
            linkText="View all"
            linkUrl="/admin/users"
          />
          <StatCard
            title="Monthly Revenue"
            value={stats?.monthlyRevenue || "R 0.00"}
            icon={<CreditCard className="h-5 w-5" />}
            linkText="View details"
            linkUrl="#"
            iconBgColor="bg-success"
          />
          <StatCard
            title="Active SIMs"
            value={stats?.activeSims || 0}
            icon={<Wifi className="h-5 w-5" />}
            linkText="View all"
            linkUrl="#"
            iconBgColor="bg-warning"
          />
        </div>

        {/* Products & Categories Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-darker">Products & Categories</h2>
            <Button onClick={() => navigate("/admin/products-pricing")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Product Categories Tabs */}
          <div className="mt-4">
            <div className="border-b border-neutral">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveCategory('MTN Fixed')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeCategory === 'MTN Fixed'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-neutral-dark hover:text-neutral-darker hover:border-neutral'
                  }`}
                >
                  MTN Fixed
                </button>
                <button
                  onClick={() => setActiveCategory('MTN GSM')}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    activeCategory === 'MTN GSM'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-neutral-dark hover:text-neutral-darker hover:border-neutral'
                  }`}
                >
                  MTN GSM
                </button>
              </nav>
            </div>
          </div>

          {/* Product Table */}
          <div className="mt-6">
            {isLoadingProducts ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ProductTable
                products={products || []}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
              />
            )}
          </div>
        </div>

        {/* Recent Reseller Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-neutral-darker">Recent Reseller Activity</h2>
          <div className="mt-4">
            {isLoadingActivities ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ActivityList activities={activities || []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
