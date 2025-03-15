import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isToday(dateObj)) {
    return `Today, ${format(dateObj, 'h:mm a')}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday, ${format(dateObj, 'h:mm a')}`;
  }
  
  if (differenceInDays(new Date(), dateObj) < 7) {
    return format(dateObj, 'EEEE, h:mm a');
  }
  
  return format(dateObj, 'yyyy-MM-dd');
}

export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  
  return Math.floor(seconds) + " seconds ago";
}

// Calculate pro-rata pricing based on day of month
export function calculateProRataPrice(basePrice: number, registrationDate: Date): {
  discountPercentage: number;
  finalPrice: number;
} {
  const day = registrationDate.getDate();
  let discountPercentage = 0;
  
  if (day >= 1 && day <= 10) {
    discountPercentage = 15;
  } else if (day >= 11 && day <= 15) {
    discountPercentage = 20;
  } else if (day >= 16 && day <= 20) {
    discountPercentage = 40;
  } else if (day >= 21) {
    discountPercentage = 70;
  }
  
  const finalPrice = basePrice * (1 - discountPercentage / 100);
  return { discountPercentage, finalPrice };
}

// Get price based on reseller group
export function getPriceByResellerGroup(product: any, resellerGroup: number): number {
  if (resellerGroup === 1) {
    return parseFloat(product.group1Price);
  } else if (resellerGroup === 2) {
    return parseFloat(product.group2Price);
  }
  return parseFloat(product.basePrice);
}
