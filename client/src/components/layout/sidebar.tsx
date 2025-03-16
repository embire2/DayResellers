import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <div className="flex flex-col w-64">
      <div className="flex flex-col h-full border-r border-neutral bg-white">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary">
          <div className="flex items-center">
            <img 
              src="/assets/Day%20Logo.png" 
              alt="Day Logo" 
              className="h-8 w-auto mr-2" 
            />
            <h1 className="text-white text-lg font-semibold">Day Resellers</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {/* Admin Navigation */}
            {user?.role === 'admin' && (
              <div>
                <p className="px-3 text-xs font-semibold text-neutral-dark uppercase tracking-wider mt-6 mb-2">
                  Administration
                </p>
                <Link 
                  href="/"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <line x1="3" x2="21" y1="9" y2="9" />
                    <line x1="9" x2="9" y1="21" y2="9" />
                  </svg>
                  Dashboard
                </Link>
                <Link 
                  href="/admin/users"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/users") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  User Management
                </Link>
                <Link 
                  href="/admin/categories"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/categories") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
                    <path d="M12 14v6" />
                    <path d="M8 17h8" />
                  </svg>
                  Categories
                </Link>
                <Link 
                  href="/admin/products-pricing"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/products-pricing") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Products & Pricing
                </Link>
                <Link 
                  href="/admin/dashboard-designer"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/dashboard-designer") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                  Dashboard Designer
                </Link>
                <Link 
                  href="/admin/api-integration"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/api-integration") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  API Integration
                </Link>
                <Link 
                  href="/admin/api-test"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/admin/api-test") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 2 2 4-4" />
                  </svg>
                  API Test Console
                </Link>
              </div>
            )}

            {/* General Navigation (Available to both roles) */}
            <p className="px-3 text-xs font-semibold text-neutral-dark uppercase tracking-wider mt-6 mb-2">
              General
            </p>
            
            {user?.role === 'reseller' ? (
              <Link 
                href="/reseller"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                  isActive("/reseller") && "sidebar-item active"
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
            ) : (
              <Link 
                href="/"
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                  isActive("/") && "sidebar-item active"
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </Link>
            )}
            
            {user?.role === 'reseller' && (
              <>
                <Link 
                  href="/reseller/clients"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/reseller/clients") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  My Clients
                </Link>
                <Link 
                  href="/reseller/products"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/reseller/products") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  Products
                </Link>
                <Link 
                  href="/reseller/billing"
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                    isActive("/reseller/billing") && "sidebar-item active"
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                  Billing
                </Link>
              </>
            )}
            
            <Link 
              href={user?.role === 'reseller' ? "/reseller/settings" : "/admin/settings"}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-darker hover:bg-neutral-lighter",
                (isActive("/reseller/settings") || isActive("/admin/settings")) && "sidebar-item active"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-neutral-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Settings
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
