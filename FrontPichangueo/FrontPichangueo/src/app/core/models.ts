export type UserRole = 'admin' | 'client';
export type BookingStatus = 'pending' | 'approved' | 'cancelled';
export type PaymentStatus = 'approved' | 'pending_review' | 'rejected';
export type PaymentType = 'advance' | 'full' | 'balance';

export interface Court {
  id: number;
  userId: number;
  adminName: string;
  name: string;
  number: number;
  description: string;
  surfaceType: string;
  playerCapacity: number;
  status: boolean;
  photoUrl: string;
  gps: string;
  address: string;
  stars: number;
  createdAt: string;
}

export interface CourtSchedule {
  id: number;
  courtId: number;
  courtNumber: number;
  courtName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  available: boolean;
  costPerHour: number;
  hasActiveBookings?: boolean;
}

export interface AvailableSchedule {
  courtScheduleId: number;
  courtId: number;
  courtNumber: number;
  adminName: string;
  courtName: string;
  description: string;
  surfaceType: string;
  playerCapacity: number;
  address: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  costPerHour: number;
  totalCost: number;
}

export interface BookingHistory {
  action: string;
  previousStatus: string | null;
  newStatus: BookingStatus;
  description: string;
  actionDate: string;
}

export interface Booking {
  id: number;
  bookingCode: string;
  clientName: string;
  clientEmail: string;
  courtNumber: number;
  courtName: string;
  adminName: string;
  scheduleDay: number;
  startTime: string;
  endTime: string;
  totalAmount: number;
  advance: number;
  status: BookingStatus;
  lostAdvance: boolean;
  bookingDate: string;
  createdAt: string;
  history: BookingHistory[];
}

export interface Payment {
  paymentId: number;
  transactionCode: string;
  courtNumber: number;
  courtName: string;
  adminName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  clientId: number;
  clientName: string;
  amount: number;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  paymentDate: string;
  gatewayResponse: {
    status: string;
    authCode: string;
    message: string;
    processedAt: string;
  };
}

export interface TeamMember {
  memberId: number;
  userId: number | null;
  displayName: string;
  role: 'leader' | 'player';
  status: boolean;
  isGhost: boolean;
  joinedAt: string;
}

export interface Team {
  id: number;
  teamName: string;
  status: boolean;
  createdAt: string;
  leaderName: string;
  memberCount: number;
  averageStars: number;
  members: TeamMember[];
}

export interface ClientSearchResult {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface TeamRating {
  ratingId: number;
  ratingTeamName: string;
  ratedTeamName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
}

export interface Challenge {
  challengeId: number;
  challengingTeamId: number;
  challengingTeamName: string;
  challengingLeaderName: string;
  challengedTeamId: number;
  challengedTeamName: string;
  message: string | null;
  proposedDateTime: string | null;
  status: boolean;
  bookingId: number | null;
  courtNumber: number | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  responseDate: string | null;
}
