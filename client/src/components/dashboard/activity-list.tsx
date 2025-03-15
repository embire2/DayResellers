import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeAgo } from "@/lib/utils";

export interface Activity {
  id: number;
  username: string;
  userAvatar?: string;
  action: string;
  timestamp: Date | string;
}

interface ActivityListProps {
  activities: Activity[];
  title?: string;
}

export function ActivityList({ activities, title = "Recent Activity" }: ActivityListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-neutral-light">
          {activities.map((activity) => (
            <li key={activity.id} className="px-6 py-4">
              <div className="flex items-center">
                <div className="min-w-0 flex-1 flex items-center">
                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      {activity.userAvatar ? (
                        <AvatarImage src={activity.userAvatar} alt={activity.username} />
                      ) : (
                        <AvatarFallback className="bg-primary-light text-white">
                          {getInitials(activity.username)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1 px-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-darker truncate">
                        {activity.username}
                      </p>
                      <p className="mt-1 text-sm text-neutral-dark" dangerouslySetInnerHTML={{ __html: activity.action }} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
