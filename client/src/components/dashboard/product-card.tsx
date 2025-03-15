import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ProductStatus } from "@shared/types";
import { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  resellerPrice: number;
  onPurchase: (product: Product) => void;
}

export function ProductCard({ product, resellerPrice, onPurchase }: ProductCardProps) {
  // Function to render the status badge with appropriate colors
  const renderStatus = (status: ProductStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success bg-opacity-10 text-success border-success">
            Available
          </Badge>
        );
      case "limited":
        return (
          <Badge className="bg-warning bg-opacity-10 text-warning border-warning">
            Limited Stock
          </Badge>
        );
      case "outofstock":
        return (
          <Badge className="bg-error bg-opacity-10 text-error border-error">
            Out of Stock
          </Badge>
        );
      default:
        return (
          <Badge className="bg-neutral bg-opacity-10 text-neutral-dark">
            {status}
          </Badge>
        );
    }
  };

  const isAvailable = product.status === "active" || product.status === "limited";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between">
          <h3 className="text-lg font-medium text-neutral-darker">{product.name}</h3>
          {renderStatus(product.status as ProductStatus)}
        </div>
        <div className="mt-2">
          <p className="text-sm text-neutral-dark">{product.description}</p>
        </div>
        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-sm text-neutral-dark">Your Price</p>
            <p className="text-xl font-bold text-neutral-darker">{formatCurrency(resellerPrice)}</p>
          </div>
          <Button
            size="sm"
            onClick={() => onPurchase(product)}
            disabled={!isAvailable}
          >
            Purchase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
