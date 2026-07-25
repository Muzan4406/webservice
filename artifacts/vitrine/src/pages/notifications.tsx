import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getGetNotificationsQueryKey } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useGetNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAsRead = (id: number) => {
    markAsRead.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        },
      }
    );
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast.success('Toutes les notifications ont été marquées comme lues');
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    });
  };

  const unreadCount = notifications.data?.notifications.filter((n) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-white">{unreadCount} nouveau(x)</Badge>
          )}
        </div>
        <p className="text-white/60 text-sm">Restez informé de vos activités</p>
      </div>

      {/* Mark all read — sits outside the floating card zone, fully visible */}
      {unreadCount > 0 && (
        <div className="px-4 pt-4">
          <Button
            data-testid="button-mark-all-read"
            onClick={handleMarkAllRead}
            variant="outline"
            className="w-full bg-white"
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <div className="px-4 pt-3 space-y-3">
        {notifications.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : notifications.data?.notifications && notifications.data.notifications.length > 0 ? (
          notifications.data.notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  notification.isRead
                    ? 'opacity-60'
                    : 'border-primary/40 shadow-sm'
                }`}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3">
                    {!notification.isRead ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    ) : (
                      <div className="w-2.5 h-2.5 mt-1.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-0.5">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mb-1.5">{notification.message}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {format(new Date(notification.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune notification
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
