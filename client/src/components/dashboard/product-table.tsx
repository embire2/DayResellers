import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@shared/schema";
import { ProductStatus } from "@shared/types";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  // Function to render the status badge with appropriate colors
  const renderStatus = (status: ProductStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-success bg-opacity-10 text-success border-success">
            Active
          </Badge>
        );
      case "limited":
        return (
          <Badge variant="outline" className="bg-warning bg-opacity-10 text-warning border-warning">
            Limited Stock
          </Badge>
        );
      case "outofstock":
        return (
          <Badge variant="outline" className="bg-error bg-opacity-10 text-error border-error">
            Out of Stock
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-neutral bg-opacity-10 text-neutral-dark">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Product Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Base Price</TableHead>
            <TableHead>Group 1 Price</TableHead>
            <TableHead>Group 2 Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <div className="text-sm text-neutral-dark">
                  {/* Display category name */}
                  {product.categoryId}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(parseFloat(product.basePrice.toString()))}</TableCell>
              <TableCell>{formatCurrency(parseFloat(product.group1Price.toString()))}</TableCell>
              <TableCell>{formatCurrency(parseFloat(product.group2Price.toString()))}</TableCell>
              <TableCell>{renderStatus(product.status as ProductStatus)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit && onEdit(product)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete && onDelete(product)}
                      className="text-error focus:text-error"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
