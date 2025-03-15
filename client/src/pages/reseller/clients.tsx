import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClientTable } from "@/components/dashboard/client-table";
import { Client, insertClientSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search } from "lucide-react";

// Client form schema
const clientFormSchema = insertClientSchema.omit({ resellerId: true });

export default function Clients() {
  const { toast } = useToast();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Client form
  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientFormSchema>) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setIsClientModalOpen(false);
      form.reset();
      toast({
        title: "Client created",
        description: "New client has been successfully created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof clientFormSchema>) => {
    createClientMutation.mutate(values);
  };

  // Filter clients based on search query
  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Mock client products data for display
  const clientsWithProducts = filteredClients?.map(client => ({
    ...client,
    products: {
      count: Math.floor(Math.random() * 5) + 1, // Mock data for demo
      summary: `${Math.floor(Math.random() * 5) + 1} MTN Fixed LTE`,
      details: Math.random() > 0.5 ? `${Math.floor(Math.random() * 3) + 1} MTN GSM Data SIM` : undefined
    },
    lastBilledDate: "2023-05-01",
    status: Math.random() > 0.8 ? "pending" : "active",
  }));

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-semibold text-neutral-darker mb-4 md:mb-0">My Clients</h1>
          <Button onClick={() => setIsClientModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-dark" />
              <Input
                placeholder="Search clients..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {clientsWithProducts && clientsWithProducts.length > 0 ? (
                  <ClientTable clients={clientsWithProducts} />
                ) : (
                  <div className="text-center py-10">
                    <p className="text-neutral-dark">No clients found{searchQuery ? " matching your search" : ""}</p>
                    {searchQuery && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Modal */}
        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client to manage their products and subscriptions
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address (optional)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter phone number (optional)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createClientMutation.isPending}
                  >
                    {createClientMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Client"
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
