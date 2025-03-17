import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientProductStatus } from "@shared/types";
import { Client, ClientProduct } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Eye } from "lucide-react";

interface ClientWithProducts extends Client {
  products: {
    count: number;
    summary: string;
    details?: string;
  };
  lastBilledDate: string;
  status: ClientProductStatus;
}

interface ClientTableProps {
  clients: ClientWithProducts[];
}

export function ClientTable({ clients }: ClientTableProps) {
  // Function to render the status badge with appropriate colors
  const renderStatus = (status: ClientProductStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-success bg-opacity-10 text-success border-success">
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-warning bg-opacity-10 text-warning border-warning">
            Pending Renewal
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="outline" className="bg-error bg-opacity-10 text-error border-error">
            Suspended
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-neutral bg-opacity-10 text-neutral-dark">
            Cancelled
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
            <TableHead className="w-[200px]">Client Name</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Last Billed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>
                {client.products ? (
                  <>
                    <div className="text-sm text-neutral-dark">{client.products.summary}</div>
                    {client.products.details && (
                      <div className="text-xs text-neutral">{client.products.details}</div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-neutral-dark">No products</div>
                )}
              </TableCell>
              <TableCell>{client.lastBilledDate ? formatDate(client.lastBilledDate) : "Not billed yet"}</TableCell>
              <TableCell>{client.status ? renderStatus(client.status) : "Unknown"}</TableCell>
              <TableCell className="text-right">
                <Link href={`/reseller/clients/${client.id}`}>
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
