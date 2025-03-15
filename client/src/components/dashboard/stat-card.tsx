import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  linkText?: string;
  linkUrl?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  linkText = "View all",
  linkUrl = "#",
  iconBgColor = "bg-primary-light",
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <div className="text-white">{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-neutral-dark truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-neutral-darker">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {linkText && linkUrl && (
        <CardFooter className="bg-neutral-lighter px-5 py-3">
          <div className="text-sm">
            <Link href={linkUrl} className="font-medium text-primary hover:text-primary-dark">
              {linkText}
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
