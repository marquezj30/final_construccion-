import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { AvailableSchedule, Booking, Challenge, ClientSearchResult, Court, CourtSchedule, Payment, Team, TeamMember, TeamRating } from './models';

export interface CourtPayload {
  name: string;
  number: number;
  description: string;
  surfaceType: string;
  playerCapacity: number;
  address: string;
  gps: string;
  photoUrl: string;
}

export interface SchedulePayload {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  costPerHour: number;
}

export interface BookingPayload {
  courtScheduleId: number;
  bookingDate: string;
  durationHours?: number;
  startTime?: string;
}

export interface PaymentPayload {
  bookingId: number;
  paymentType: 'advance' | 'full' | 'balance';
}

export interface TeamPayload {
  teamName: string;
}

export interface ChallengePayload {
  challengedTeamId: number;
  message?: string;
  proposedDateTime?: string | null;
  courtScheduleId?: number | null;
  isExternal: boolean;
}

export interface AcceptChallengePayload {
  courtScheduleId?: number | null;
  bookingDate?: string | null;
}

export interface AcceptChallengeResult {
  challenge: Challenge;
  warning?: string;
}

export interface RatingPayload {
  ratedTeamId: number;
  stars: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getCourts(): Observable<Court[]> {
    return this.http.get<Court[]>(`${API_BASE_URL}/courts`).pipe(
      map((courts) => courts.map((court) => this.normalizeCourt(court))),
    );
  }

  getCourt(id: number): Observable<Court> {
    return this.http.get<Court>(`${API_BASE_URL}/courts/${id}`).pipe(
      map((court) => this.normalizeCourt(court)),
    );
  }

  createCourt(payload: CourtPayload): Observable<Court> {
    return this.http.post<Court>(`${API_BASE_URL}/courts`, payload).pipe(
      map((court) => this.normalizeCourt(court)),
    );
  }

  updateCourt(id: number, payload: CourtPayload): Observable<Court> {
    return this.http.put<Court>(`${API_BASE_URL}/courts/${id}`, payload).pipe(
      map((court) => this.normalizeCourt(court)),
    );
  }

  deactivateCourt(id: number): Observable<Court> {
    return this.http.delete<Court>(`${API_BASE_URL}/courts/${id}`).pipe(
      map((court) => this.normalizeCourt(court)),
    );
  }

  updateCourtStatus(id: number, status: boolean): Observable<Court> {
    return this.http.patch<Court>(`${API_BASE_URL}/courts/${id}/status`, { status }).pipe(
      map((court) => this.normalizeCourt(court)),
    );
  }

  getAllSchedules(): Observable<CourtSchedule[]> {
    return this.http.get<CourtSchedule[]>(`${API_BASE_URL}/courts/schedules`);
  }

  getSchedules(courtId: number): Observable<CourtSchedule[]> {
    return this.http.get<CourtSchedule[]>(`${API_BASE_URL}/courts/${courtId}/schedules`);
  }

  createSchedule(courtId: number, payload: SchedulePayload): Observable<CourtSchedule> {
    return this.http.post<CourtSchedule>(`${API_BASE_URL}/courts/${courtId}/schedules`, payload);
  }

  updateSchedule(courtId: number, scheduleId: number, payload: SchedulePayload): Observable<CourtSchedule> {
    return this.http.put<CourtSchedule>(`${API_BASE_URL}/courts/${courtId}/schedules/${scheduleId}`, payload);
  }

  deleteSchedule(courtId: number, scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/courts/${courtId}/schedules/${scheduleId}`);
  }

  getAvailableSchedules(bookingDate: string, courtId?: number): Observable<AvailableSchedule[]> {
    const params = `bookingDate=${encodeURIComponent(bookingDate)}`;
    const url = courtId
      ? `${API_BASE_URL}/courts/${courtId}/available?${params}`
      : `${API_BASE_URL}/courts/available?${params}`;

    return this.http.get<AvailableSchedule[]>(url).pipe(
      map((schedules) => schedules.map((schedule) => this.normalizeAvailableSchedule(schedule))),
    );
  }

  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${API_BASE_URL}/bookings`).pipe(
      map((bookings) => bookings.map((booking) => this.normalizeBooking(booking))),
    );
  }

  getBooking(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${API_BASE_URL}/bookings/${id}`).pipe(
      map((booking) => this.normalizeBooking(booking)),
    );
  }

  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${API_BASE_URL}/payments`).pipe(
      map((payments) => payments.map((payment) => this.normalizePayment(payment))),
    );
  }

  getPaymentsByBooking(bookingId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${API_BASE_URL}/payments/${bookingId}`).pipe(
      map((payments) => payments.map((payment) => this.normalizePayment(payment))),
      catchError((error) => error.status === 404 ? of([]) : throwError(() => error)),
    );
  }

  createBooking(payload: BookingPayload): Observable<Booking> {
    return this.http.post<Booking>(`${API_BASE_URL}/bookings`, payload).pipe(
      map((booking) => this.normalizeBooking(booking)),
    );
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${API_BASE_URL}/bookings/my`).pipe(
      map((bookings) => bookings.map((booking) => this.normalizeBooking(booking))),
    );
  }

  cancelBooking(id: number): Observable<Booking> {
    return this.http.put<Booking>(`${API_BASE_URL}/bookings/${id}/cancel`, {}).pipe(
      map((booking) => this.normalizeBooking(booking)),
    );
  }

  createPayment(payload: PaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(`${API_BASE_URL}/payments`, payload).pipe(
      map((payment) => this.normalizePayment(payment)),
    );
  }

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API_BASE_URL}/teams`).pipe(
      map((teams) => teams.map((team) => this.normalizeTeam(team))),
    );
  }

  getMyTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API_BASE_URL}/teams/my`).pipe(
      map((teams) => teams.map((team) => this.normalizeTeam(team))),
    );
  }

  getTeam(id: number): Observable<Team> {
    return this.http.get<Team>(`${API_BASE_URL}/teams/${id}`).pipe(
      map((team) => this.normalizeTeam(team)),
    );
  }

  createTeam(payload: TeamPayload): Observable<Team> {
    return this.http.post<Team>(`${API_BASE_URL}/teams`, payload).pipe(
      map((team) => this.normalizeTeam(team)),
    );
  }

  updateTeam(id: number, payload: TeamPayload): Observable<Team> {
    return this.http.put<Team>(`${API_BASE_URL}/teams/${id}`, payload).pipe(
      map((team) => this.normalizeTeam(team)),
    );
  }

  searchClients(query: string): Observable<ClientSearchResult[]> {
    return this.http.get<ClientSearchResult[]>(`${API_BASE_URL}/teams/users/search`, {
      params: { q: query },
    });
  }

  addRealTeamMember(teamId: number, username: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${API_BASE_URL}/teams/${teamId}/members/real/by-username`, { username });
  }

  addGhostTeamMember(teamId: number, externalName: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${API_BASE_URL}/teams/${teamId}/members/ghost`, { externalName });
  }

  removeTeamMember(teamId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/teams/${teamId}/members/${memberId}`);
  }

  leaveTeam(teamId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/teams/${teamId}/members/me`);
  }

  joinTeam(teamId: number): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${API_BASE_URL}/teams/${teamId}/members/me`, {});
  }

  promoteTeamMember(teamId: number, memberId: number): Observable<unknown> {
    return this.http.put<unknown>(`${API_BASE_URL}/teams/${teamId}/members/${memberId}/promote`, {});
  }

  sendChallenge(payload: ChallengePayload): Observable<Challenge> {
    return this.http.post<Challenge>(`${API_BASE_URL}/challenges`, payload);
  }

  getSentChallenges(): Observable<Challenge[]> {
    return this.http.get<Challenge[]>(`${API_BASE_URL}/challenges/sent`);
  }

  getReceivedChallenges(): Observable<Challenge[]> {
    return this.http.get<Challenge[]>(`${API_BASE_URL}/challenges/received`);
  }

  acceptChallenge(challengeId: number, payload: AcceptChallengePayload): Observable<Challenge | AcceptChallengeResult> {
    return this.http.put<Challenge | AcceptChallengeResult>(
      `${API_BASE_URL}/challenges/${challengeId}/accept`,
      payload,
    );
  }

  rejectChallenge(challengeId: number): Observable<Challenge> {
    return this.http.put<Challenge>(`${API_BASE_URL}/challenges/${challengeId}/reject`, {});
  }

  getChallenge(challengeId: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${API_BASE_URL}/challenges/${challengeId}`);
  }

  createChallengeBooking(challengeId: number, payload: { courtScheduleId: number; bookingDate: string }): Observable<Challenge> {
    return this.http.post<Challenge>(`${API_BASE_URL}/challenges/${challengeId}/booking`, payload);
  }

  rateTeam(payload: RatingPayload): Observable<TeamRating> {
    return this.http.post<TeamRating>(`${API_BASE_URL}/ratings`, payload);
  }

  getTeamRatings(teamId: number): Observable<TeamRating[]> {
    return this.http.get<TeamRating[]>(`${API_BASE_URL}/teams/${teamId}/ratings`);
  }

  private normalizeCourt(court: Court): Court {
    return {
      ...court,
      name: court.name || `Cancha ${court.number || court.id}`,
      photoUrl: court.photoUrl || '',
      description: court.description || '',
      surfaceType: court.surfaceType || '',
      address: court.address || '',
      gps: court.gps || '',
    };
  }

  private normalizeAvailableSchedule(schedule: AvailableSchedule): AvailableSchedule {
    return {
      ...schedule,
      courtName: schedule.courtName || `Cancha ${schedule.courtNumber || schedule.courtId}`,
      description: schedule.description || '',
      surfaceType: schedule.surfaceType || '',
      address: schedule.address || '',
    };
  }

  private normalizeBooking(booking: Booking): Booking {
    return {
      ...booking,
      clientName: 'Cliente',
      clientEmail: '',
      courtName: booking.courtName || `Cancha ${booking.courtNumber}`,
      history: [],
      ...(booking.clientName ? { clientName: booking.clientName } : {}),
      ...(booking.clientEmail ? { clientEmail: booking.clientEmail } : {}),
      ...(booking.history ? { history: booking.history } : {}),
    };
  }

  private normalizeTeam(team: Team): Team {
    return {
      ...team,
      teamName: team.teamName || 'Equipo sin nombre',
      leaderName: team.leaderName || 'Sin lider',
      memberCount: team.memberCount ?? team.members?.length ?? 0,
      averageStars: team.averageStars ?? 0,
      members: team.members || [],
    };
  }

  private normalizePayment(payment: Payment): Payment {
    const parsedGateway = this.parseGatewayResponse(payment.gatewayResponse);

    return {
      ...payment,
      courtName: payment.courtName || `Cancha ${payment.courtNumber}`,
      gatewayResponse: parsedGateway,
    };
  }

  private parseGatewayResponse(response: Payment['gatewayResponse'] | string | null): Payment['gatewayResponse'] {
    if (typeof response === 'object' && response !== null) {
      return response;
    }

    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch {
        return {
          status: 'unknown',
          authCode: '',
          message: response,
          processedAt: '',
        };
      }
    }

    return {
      status: 'unknown',
      authCode: '',
      message: 'Sin respuesta registrada',
      processedAt: '',
    };
  }
}
