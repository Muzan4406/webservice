export const COUNTRIES = [
  'Togo',
  'Bénin',
  "Côte d'Ivoire",
  'Burkina Faso',
  'Cameroun',
  'Congo démocratique',
  'Congo Brazzaville',
];

export type Operator = {
  id: string;
  label: string;
  color: string;
  bg: string;
};

export const OPERATORS_BY_COUNTRY: Record<string, Operator[]> = {
  'Togo': [
    { id: 'tmoney',    label: 'T-Money', color: '#2F55F0', bg: '#EAF0FE' },
    { id: 'moov',      label: 'Moov',    color: '#EA580C', bg: '#FFEDD5' },
  ],
  'Bénin': [
    { id: 'mtn',       label: 'MTN MoMo',color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'moov',      label: 'Moov',    color: '#EA580C', bg: '#FFEDD5' },
  ],
  "Côte d'Ivoire": [
    { id: 'orange',    label: 'Orange Money', color: '#EA580C', bg: '#FFEDD5' },
    { id: 'mtn',       label: 'MTN MoMo',     color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'wave',      label: 'Wave',          color: '#0EA5E9', bg: '#E0F2FE' },
    { id: 'moov',      label: 'Moov',          color: '#7C3AED', bg: '#EDE9FE' },
  ],
  'Burkina Faso': [
    { id: 'orange',    label: 'Orange Money', color: '#EA580C', bg: '#FFEDD5' },
    { id: 'moov',      label: 'Moov',         color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'wave',      label: 'Wave',          color: '#0EA5E9', bg: '#E0F2FE' },
  ],
  'Cameroun': [
    { id: 'orange',    label: 'Orange Money', color: '#EA580C', bg: '#FFEDD5' },
    { id: 'mtn',       label: 'MTN MoMo',     color: '#F59E0B', bg: '#FFFBEB' },
  ],
  'Congo démocratique': [
    { id: 'airtel',    label: 'Airtel Money', color: '#DC2626', bg: '#FEE2E2' },
    { id: 'orange',    label: 'Orange Money', color: '#EA580C', bg: '#FFEDD5' },
    { id: 'mpesa',     label: 'M-Pesa',       color: '#16A34A', bg: '#DCFCE7' },
  ],
  'Congo Brazzaville': [
    { id: 'airtel',    label: 'Airtel Money', color: '#DC2626', bg: '#FEE2E2' },
    { id: 'mtn',       label: 'MTN MoMo',     color: '#F59E0B', bg: '#FFFBEB' },
  ],
};

export const PAYMENT_OPERATORS = [
  'Orange Money',
  'MTN Mobile Money',
  'Moov Money',
  'Wave',
  'Airtel Money',
  'Free Money',
  'M-Pesa',
  'Autre',
];
