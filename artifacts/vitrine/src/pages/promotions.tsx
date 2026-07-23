import { motion } from 'framer-motion';
import { useGetPromotions } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PromotionsPage() {
  const promotions = useGetPromotions();

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <h1 className="text-2xl font-bold text-white">Promotions</h1>
        <p className="text-white/60 text-sm">Offres exclusives pour vous</p>
      </div>

      <div className="px-6 -mt-4 space-y-4">
        {promotions.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : promotions.data?.promotions && promotions.data.promotions.length > 0 ? (
          promotions.data.promotions
            .filter((promo) => promo.isActive)
            .map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{promo.title}</CardTitle>
                      <Badge className="bg-purple-500">Actif</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {promo.imageUrl && (
                      <img
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {promo.content}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune promotion disponible pour le moment
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
