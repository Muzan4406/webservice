import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getGetNotificationsQueryKey } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { CheckCheck, Bell, BellOff, ChevronLeft } from 'lucide-react';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLocation } from 'wouter';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const notifications = useGetNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkAsRead = (id: number) => {
    markAsRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast.success('Tout lu !');
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      },
    });
  };

  const list = notifications.data?.notifications ?? [];
  const unreadCount = list.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-10 pb-6 relative overflow-hidden shrink-0">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setLocation('/')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            <p className="text-white/50 text-xs mt-0.5">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 transition-all px-3 py-2 rounded-xl text-white text-xs font-semibold"
            >
              <CheckCheck className="w-4 h-4" />
              Tout lire
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {notifications.isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a2a5e]/20 border-t-[#1a2a5e] animate-spin" />
          </div>
        ) : list.length > 0 ? (
          <AnimatePresence>
            {list.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                className={`relative bg-white rounded-2xl px-4 py-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all ${
                  notif.isRead ? 'opacity-60' : 'border border-[#1a2a5e]/10'
                }`}
              >
                {/* Unread dot */}
                {!notif.isRead && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#1a2a5e]" />
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.isRead ? 'bg-gray-100' : 'bg-[#1a2a5e]/10'
                  }`}>
                    <Bell className={`w-4 h-4 ${notif.isRead ? 'text-gray-400' : 'text-[#1a2a5e]'}`} />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-sm font-bold leading-snug mb-0.5 ${notif.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {format(new Date(notif.createdAt), "dd MMM 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-600 mb-1">Aucune notification</p>
            <p className="text-sm text-gray-400">Vous êtes à jour !</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
