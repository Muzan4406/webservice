import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGetDailyCoupons, useGetVipCoupons, useGetAppSettings } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CouponsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const dailyCoupons = useGetDailyCoupons();
  const vipCoupons = useGetVipCoupons();
  const appSettings = useGetAppSettings();

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <h1 className="text-2xl font-bold text-white">Coupons</h1>
        <p className="text-white/60 text-sm">Pronostics analysés pour vous</p>
      </div>

      <div className="px-6 -mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="daily">Du jour</TabsTrigger>
            <TabsTrigger value="vip">VIP</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            {dailyCoupons.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dailyCoupons.data?.coupons && dailyCoupons.data.coupons.length > 0 ? (
              dailyCoupons.data.coupons.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{coupon.title}</CardTitle>
                        {coupon.odds && (
                          <Badge variant="secondary" className="ml-2">
                            Cote: {coupon.odds}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(coupon.date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {coupon.imageUrl && (
                        <img
                          src={coupon.imageUrl}
                          alt={coupon.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{coupon.content}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucun coupon du jour disponible
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vip" className="space-y-4">
            {!user?.isVip ? (
              <Card className="bg-gradient-to-br from-[#FFD700]/10 to-[#FFA500]/10 border-[#FFD700]/20">
                <CardContent className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#FFD700]/20 flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-[#FFD700]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Accès VIP requis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Débloquez les coupons VIP à haute probabilité pour seulement{' '}
                    <strong className="text-foreground">
                      {appSettings.data?.vipPriceFcfa || 5000} FCFA
                    </strong>
                  </p>
                  <Button asChild className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold">
                    <Link href="/profile">Devenir VIP</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : vipCoupons.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : vipCoupons.data?.coupons && vipCoupons.data.coupons.length > 0 ? (
              vipCoupons.data.coupons.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/5 to-transparent">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#FFD700] text-black">VIP</Badge>
                          <CardTitle className="text-lg">{coupon.title}</CardTitle>
                        </div>
                        {coupon.odds && (
                          <Badge variant="secondary">Cote: {coupon.odds}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(coupon.date), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {coupon.imageUrl && (
                        <img
                          src={coupon.imageUrl}
                          alt={coupon.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{coupon.content}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucun coupon VIP disponible
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
