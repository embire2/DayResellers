import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Search, BellIcon, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button
        type="button"
        className="px-4 border-r border-neutral md:hidden"
        onClick={toggleSidebar}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-neutral-dark"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-full text-neutral-dark focus-within:text-neutral-darker">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="h-5 w-5 ml-3" />
              </div>
              <Input
                className="block w-full h-full pl-10 pr-3 py-2 border-transparent rounded-md text-neutral-darker placeholder-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm"
                placeholder="Search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          {/* Credit Balance for All Users */}
          {user && (
            <div className="mr-4 flex items-center">
              <div className="relative">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl px-4 py-2 shadow-md border border-primary/10">
                  <div className="bg-gradient-to-br from-primary to-primary-dark rounded-full p-2 shadow-inner">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 18V6"/>
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-dark font-medium">Credit Balance</span>
                    <span className="text-base font-bold bg-gradient-to-r from-primary to-primary-dark inline-block text-transparent bg-clip-text">
                      {user.creditBalance ? formatCurrency(parseFloat(user.creditBalance.toString())) : 'R 0.00'}
                    </span>
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 bg-success text-white text-xs font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  Active
                </div>
              </div>
            </div>
          )}

          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="p-1 rounded-full text-neutral-dark hover:text-neutral-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" />
          </Button>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="ml-3 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <span className="sr-only">Open user menu</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-white">
                    {user ? getInitials(user.username) : "?"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                {logoutMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
