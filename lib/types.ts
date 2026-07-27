export type Role = 'CUSTOMER' | 'RIDER' | 'BUSINESS' | 'ADMIN';

export type OrderStatus = 'PLACED' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export type RiderStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export const ZONES = [
  'KIMIRONKO',
  'NYARUTARAMA',
  'REMERA',
  'KACYIRU',
  'KIMISAGARA',
  'NYAMIRAMBO',
  'GIKONDO',
  'KICUKIRO',
  'GISOZI',
  'KABEZA',
] as const;

export type Zone = (typeof ZONES)[number];

export const ZONE_LABEL: Record<Zone, string> = {
  KIMIRONKO: 'Kimironko',
  NYARUTARAMA: 'Nyarutarama',
  REMERA: 'Remera',
  KACYIRU: 'Kacyiru',
  KIMISAGARA: 'Kimisagara',
  NYAMIRAMBO: 'Nyamirambo',
  GIKONDO: 'Gikondo',
  KICUKIRO: 'Kicukiro',
  GISOZI: 'Gisozi',
  KABEZA: 'Kabeza',
};

export interface RiderProfile {
  id: string;
  userId: string;
  status: RiderStatus;
  vehicle: string;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  address: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  language: 'rw' | 'en';
  createdAt: string;
  riderProfile?: RiderProfile | null;
  businessProfile?: BusinessProfile | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  momoPhone: string;
  status: PaymentStatus;
  transactionRef: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  orderId: string;
  riderId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  riderId: string | null;
  pickup: string;
  pickupZone: Zone;
  dropoff: string;
  dropoffZone: Zone;
  item: string;
  weight: number;
  cost: number;
  riderPayout: number;
  status: OrderStatus;
  createdAt: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  payment: Payment | null;
  rating: Rating | null;
  customer?: User;
  rider?: User | null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Order placed',
  ASSIGNED: 'Rider assigned',
  PICKED_UP: 'Picked up',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// The live progress stepper only covers the "happy path" — CANCELLED is a
// terminal state shown separately, not a step on this line.
export const STATUS_ORDER: OrderStatus[] = ['PLACED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export interface MonthlyStat {
  month: string;
  deliveries: number;
  revenue: number;
  newRiders: number;
  newCustomers: number;
  averageRating: number | null;
}

export interface AdminStats {
  totalDeliveries: number;
  totalRevenue: number;
  activeRiders: number;
  totalRiders: number;
  pendingRiders: number;
  suspendedRiders: number;
  totalCustomers: number;
  totalBusinesses: number;
  totalOrders: number;
  cancelledOrders: number;
  averageRating: number | null;
  busiestZones: { zone: Zone; count: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  monthly: MonthlyStat[];
}
