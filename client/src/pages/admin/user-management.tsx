import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, insertUserSchema } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Edit, RefreshCw } from "lucide-react";

// Extend the insert schema for the form
const createUserSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  creditBalance: z.string().optional(),
  resellerGroup: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const updateCreditSchema = z.object({
  userId: z.number(),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["add", "subtract"]),
});

export default function UserManagement() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Create user form
  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: "reseller",
      creditBalance: "0",
      resellerGroup: "1",
    },
  });

  // Credit form
  const creditForm = useForm<z.infer<typeof updateCreditSchema>>({
    resolver: zodResolver(updateCreditSchema),
    defaultValues: {
      userId: 0,
      amount: "",
      type: "add",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const { confirmPassword, ...userData } = data;
      
      console.log("Attempting to create user with data:", {
        ...userData,
        password: "[REDACTED]" // Don't log the actual password
      });
      
      try {
        const res = await apiRequest("POST", "/api/users", userData);
        
        if (!res.ok) {
          // Attempt to parse the error response
          const errorData = await res.json().catch(() => null);
          console.error("User creation API error:", errorData);
          
          // Throw a detailed error
          throw new Error(
            errorData?.message || errorData?.error || `Error: ${res.status} ${res.statusText}`
          );
        }
        
        return await res.json();
      } catch (error) {
        console.error("User creation failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("User created successfully:", data.username);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddModalOpen(false);
      form.reset();
      toast({
        title: "User created",
        description: `New user "${data.username}" has been successfully created`,
      });
    },
    onError: (error: any) => {
      console.error("User creation error in component:", error);
      
      // Extract the error details from various possible formats
      const errorMessage = error.message || "Unknown error occurred";
      const errorDetails = error.details || error.error || "";
      
      toast({
        title: "Error creating user",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update credit mutation
  const updateCreditMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateCreditSchema>) => {
      const res = await apiRequest("POST", `/api/users/${data.userId}/credit`, {
        amount: data.amount,
        type: data.type,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreditModalOpen(false);
      creditForm.reset();
      toast({
        title: "Credit updated",
        description: "User's credit has been successfully updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating credit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(values);
  };

  const onCreditSubmit = (values: z.infer<typeof updateCreditSchema>) => {
    updateCreditMutation.mutate(values);
  };

  const openCreditModal = (user: User) => {
    setSelectedUser(user);
    creditForm.setValue("userId", user.id);
    setIsCreditModalOpen(true);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-neutral-darker">User Management</h1>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new reseller or admin user to the system
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="reseller">Reseller</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="resellerGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reseller Group</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Group 1</SelectItem>
                            <SelectItem value="2">Group 2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Credit Balance</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Credit Balance</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <span className={`capitalize ${user.role === 'admin' ? 'text-primary' : 'text-neutral-darker'}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>{user.resellerGroup || "N/A"}</TableCell>
                      <TableCell>
                        {user.creditBalance 
                          ? formatCurrency(parseFloat(user.creditBalance.toString())) 
                          : "R 0.00"
                        }
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary mr-2"
                          onClick={() => openCreditModal(user)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Credit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-neutral-darker"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Credit Update Modal */}
        <Dialog open={isCreditModalOpen} onOpenChange={setIsCreditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Credit Balance</DialogTitle>
              <DialogDescription>
                {selectedUser && `Manage credit for user: ${selectedUser.username}`}
              </DialogDescription>
            </DialogHeader>
            <Form {...creditForm}>
              <form onSubmit={creditForm.handleSubmit(onCreditSubmit)} className="space-y-4">
                <FormField
                  control={creditForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="add">Add Credit</SelectItem>
                          <SelectItem value="subtract">Subtract Credit</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={creditForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (ZAR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updateCreditMutation.isPending}>
                    {updateCreditMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Update Credit"
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
