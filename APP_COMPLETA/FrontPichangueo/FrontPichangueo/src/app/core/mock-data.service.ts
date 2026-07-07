import { Injectable } from '@angular/core';
import { Booking, Court, CourtSchedule, Payment } from './models';

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly storageKey = 'pichangueo_mock_state_v3';

  readonly courts: Court[];
  readonly schedules: CourtSchedule[];
  readonly bookings: Booking[];
  readonly payments: Payment[];

  private readonly defaultCourts: Court[] = [
    {
      id: 1,
      userId: 1,
      adminName: 'Luis Gonzalo',
      name: 'Cancha Principal',
      number: 1,
      description: 'Cancha principal para partidos 6 vs 6 con iluminacion nocturna.',
      surfaceType: 'Sintetica',
      playerCapacity: 12,
      status: true,
      photoUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=900&q=80',
      gps: '-12.0464,-77.0428',
      address: 'Av. Los Deportistas 221, Lima',
      stars: 4.8,
      createdAt: '2026-05-16',
    },
    {
      id: 2,
      userId: 1,
      adminName: 'Luis Gonzalo',
      name: 'Cancha Norte',
      number: 2,
      description: 'Cancha secundaria para entrenamientos y reservas privadas.',
      surfaceType: 'Natural',
      playerCapacity: 10,
      status: false,
      photoUrl: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=900&q=80',
      gps: '-12.0520,-77.0370',
      address: 'Jr. Futbol 118, Lima',
      stars: 4.2,
      createdAt: '2026-05-18',
    },
    {
      id: 3,
      userId: 1,
      adminName: 'Luis Gonzalo',
      name: 'Cancha Rapida',
      number: 3,
      description: 'Cancha rapida con graderias y zona de hidratacion.',
      surfaceType: 'Cemento deportivo',
      playerCapacity: 14,
      status: true,
      photoUrl: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?auto=format&fit=crop&w=900&q=80',
      gps: '-12.0602,-77.0481',
      address: 'Calle La Pichanga 450, Lima',
      stars: 4.6,
      createdAt: '2026-06-02',
    },
  ];

  private readonly defaultSchedules: CourtSchedule[] = [
    { id: 101, courtId: 1, courtNumber: 1, dayOfWeek: 1, startTime: '18:00', endTime: '19:00', available: true, costPerHour: 80, hasActiveBookings: true },
    { id: 102, courtId: 1, courtNumber: 1, dayOfWeek: 1, startTime: '19:00', endTime: '20:00', available: true, costPerHour: 90 },
    { id: 103, courtId: 1, courtNumber: 1, dayOfWeek: 3, startTime: '20:00', endTime: '22:00', available: false, costPerHour: 95 },
    { id: 201, courtId: 2, courtNumber: 2, dayOfWeek: 2, startTime: '17:00', endTime: '18:00', available: false, costPerHour: 70 },
    { id: 301, courtId: 3, courtNumber: 3, dayOfWeek: 5, startTime: '21:00', endTime: '22:30', available: true, costPerHour: 110 },
  ];

  private readonly defaultBookings: Booking[] = [
    {
      id: 501,
      bookingCode: 'RES-A58CECF7',
      clientName: 'Carlos Angulo',
      clientEmail: 'carlos.angulo@mail.com',
      courtNumber: 1,
      courtName: 'Cancha principal',
      adminName: 'Luis Gonzalo',
      scheduleDay: 1,
      startTime: '18:00',
      endTime: '19:00',
      totalAmount: 80,
      advance: 40,
      status: 'approved',
      lostAdvance: false,
      bookingDate: '2026-06-17',
      createdAt: '2026-06-16T20:15:00',
      history: [
        {
          action: 'BOOKING_CREATED',
          previousStatus: null,
          newStatus: 'pending',
          description: 'Reserva creada por el cliente.',
          actionDate: '2026-06-16T20:15:00',
        },
        {
          action: 'PAYMENT_APPROVED',
          previousStatus: 'pending',
          newStatus: 'approved',
          description: 'Pago simulado aprobado. Tipo: advance.',
          actionDate: '2026-06-16T20:22:00',
        },
      ],
    },
    {
      id: 502,
      bookingCode: 'RES-54DDE8F2',
      clientName: 'Marta Rojas',
      clientEmail: 'marta.rojas@mail.com',
      courtNumber: 3,
      courtName: 'Cancha rapida',
      adminName: 'Luis Gonzalo',
      scheduleDay: 5,
      startTime: '21:00',
      endTime: '22:30',
      totalAmount: 165,
      advance: 82.5,
      status: 'pending',
      lostAdvance: false,
      bookingDate: '2026-06-19',
      createdAt: '2026-06-17T08:40:00',
      history: [
        {
          action: 'BOOKING_CREATED',
          previousStatus: null,
          newStatus: 'pending',
          description: 'Reserva creada por el cliente.',
          actionDate: '2026-06-17T08:40:00',
        },
      ],
    },
    {
      id: 503,
      bookingCode: 'RES-09A81C2D',
      clientName: 'Jorge Salazar',
      clientEmail: 'jorge.salazar@mail.com',
      courtNumber: 2,
      courtName: 'Cancha techada',
      adminName: 'Luis Gonzalo',
      scheduleDay: 2,
      startTime: '17:00',
      endTime: '18:00',
      totalAmount: 70,
      advance: 35,
      status: 'cancelled',
      lostAdvance: true,
      bookingDate: '2026-06-16',
      createdAt: '2026-06-15T13:00:00',
      history: [
        {
          action: 'BOOKING_CREATED',
          previousStatus: null,
          newStatus: 'pending',
          description: 'Reserva creada por el cliente.',
          actionDate: '2026-06-15T13:00:00',
        },
        {
          action: 'BOOKING_CANCELLED',
          previousStatus: 'pending',
          newStatus: 'cancelled',
          description: 'Reserva cancelada con menos de 4 horas de anticipacion.',
          actionDate: '2026-06-16T14:50:00',
        },
      ],
    },
  ];

  private readonly defaultPayments: Payment[] = [
    {
      paymentId: 9001,
      transactionCode: 'TXN-241269431',
      courtNumber: 1,
      courtName: 'Cancha principal',
      adminName: 'Luis Gonzalo',
      bookingDate: '2026-06-17',
      startTime: '18:00',
      endTime: '19:00',
      clientId: 2,
      clientName: 'Carlos Angulo',
      amount: 40,
      paymentType: 'advance',
      paymentStatus: 'approved',
      paymentDate: '2026-06-16T20:22:00',
      gatewayResponse: {
        status: 'approved',
        authCode: 'SIM-41AF2C',
        message: 'Transaccion simulada exitosa',
        processedAt: '2026-06-16T20:22:00',
      },
    },
    {
      paymentId: 9002,
      transactionCode: 'TXN-241277903',
      courtNumber: 3,
      courtName: 'Cancha rapida',
      adminName: 'Luis Gonzalo',
      bookingDate: '2026-06-19',
      startTime: '21:00',
      endTime: '22:30',
      clientId: 3,
      clientName: 'Marta Rojas',
      amount: 82.5,
      paymentType: 'advance',
      paymentStatus: 'pending_review',
      paymentDate: '2026-06-17T08:45:00',
      gatewayResponse: {
        status: 'pending_review',
        authCode: 'SIM-REVIEW',
        message: 'Pago pendiente de revision administrativa.',
        processedAt: '2026-06-17T08:45:00',
      },
    },
  ];

  constructor() {
    const savedState = this.readState();

    this.courts = savedState?.courts ?? this.clone(this.defaultCourts);
    this.schedules = savedState?.schedules ?? this.clone(this.defaultSchedules);
    this.bookings = savedState?.bookings ?? this.clone(this.defaultBookings);
    this.payments = savedState?.payments ?? this.clone(this.defaultPayments);

    this.persist();
  }

  getCourt(id: number): Court | undefined {
    return this.courts.find((court) => court.id === id);
  }

  getSchedulesByCourt(courtId: number): CourtSchedule[] {
    return this.schedules.filter((schedule) => schedule.courtId === courtId);
  }

  getBooking(id: number): Booking | undefined {
    return this.bookings.find((booking) => booking.id === id);
  }

  getPayment(id: number): Payment | undefined {
    return this.payments.find((payment) => payment.paymentId === id);
  }

  saveCourt(courtData: Partial<Court>, courtId?: number): Court {
    const now = new Date().toISOString();
    const existingIndex = courtId ? this.courts.findIndex((court) => court.id === courtId) : -1;

    if (existingIndex >= 0) {
      const previous = this.courts[existingIndex];
      const updated: Court = {
        ...previous,
        ...courtData,
        id: previous.id,
        userId: previous.userId,
        adminName: previous.adminName,
        name: courtData.name?.trim() || previous.name,
        number: previous.number,
        playerCapacity: Number(courtData.playerCapacity ?? previous.playerCapacity),
      };

      this.courts.splice(existingIndex, 1, updated);
      this.schedules
        .filter((schedule) => schedule.courtId === updated.id)
        .forEach((schedule) => {
          schedule.courtNumber = updated.number;
        });
      this.persist();
      return updated;
    }

    const court: Court = {
      id: this.nextId(this.courts),
      userId: 1,
      adminName: 'Luis Gonzalo',
      name: courtData.name?.trim() || `Cancha ${this.nextCourtNumber()}`,
      number: this.nextCourtNumber(),
      description: courtData.description ?? '',
      surfaceType: courtData.surfaceType ?? 'Sintetica',
      playerCapacity: Number(courtData.playerCapacity ?? 12),
      status: true,
      photoUrl: courtData.photoUrl ?? '',
      gps: courtData.gps ?? '',
      address: courtData.address ?? '',
      stars: 0,
      createdAt: now,
    };

    this.courts.push(court);
    this.persist();
    return court;
  }

  deactivateCourt(courtId: number): void {
    const court = this.getCourt(courtId);

    if (!court) {
      return;
    }

    court.status = false;
    this.schedules
      .filter((schedule) => schedule.courtId === courtId)
      .forEach((schedule) => {
        schedule.available = false;
      });
    this.persist();
  }

  saveSchedule(scheduleData: Partial<CourtSchedule>, courtId: number, scheduleId?: number): CourtSchedule {
    const court = this.getCourt(courtId);
    const existingIndex = scheduleId
      ? this.schedules.findIndex((schedule) => schedule.id === scheduleId && schedule.courtId === courtId)
      : -1;

    if (existingIndex >= 0) {
      const previous = this.schedules[existingIndex];
      const updated: CourtSchedule = {
        ...previous,
        ...scheduleData,
        id: previous.id,
        courtId,
        courtNumber: court?.number ?? previous.courtNumber,
        dayOfWeek: Number(scheduleData.dayOfWeek ?? previous.dayOfWeek),
        costPerHour: Number(scheduleData.costPerHour ?? previous.costPerHour),
        available: Boolean(scheduleData.available ?? previous.available),
      };

      this.schedules.splice(existingIndex, 1, updated);
      this.persist();
      return updated;
    }

    const schedule: CourtSchedule = {
      id: this.nextId(this.schedules),
      courtId,
      courtNumber: court?.number ?? 0,
      dayOfWeek: Number(scheduleData.dayOfWeek ?? 1),
      startTime: scheduleData.startTime ?? '18:00',
      endTime: scheduleData.endTime ?? '19:00',
      available: Boolean(scheduleData.available ?? true),
      costPerHour: Number(scheduleData.costPerHour ?? 80),
    };

    this.schedules.push(schedule);
    this.persist();
    return schedule;
  }

  deleteSchedule(courtId: number, scheduleId: number): boolean {
    const schedule = this.schedules.find((item) => item.id === scheduleId && item.courtId === courtId);

    if (!schedule || schedule.hasActiveBookings) {
      return false;
    }

    this.schedules.splice(this.schedules.indexOf(schedule), 1);
    this.persist();
    return true;
  }

  resetState(): void {
    this.replaceArray(this.courts, this.defaultCourts);
    this.replaceArray(this.schedules, this.defaultSchedules);
    this.replaceArray(this.bookings, this.defaultBookings);
    this.replaceArray(this.payments, this.defaultPayments);
    this.persist();
  }

  private nextCourtNumber(): number {
    return Math.max(...this.courts.map((court) => court.number), 0) + 1;
  }

  private nextId(items: { id?: number; paymentId?: number }[]): number {
    return Math.max(...items.map((item) => item.id ?? item.paymentId ?? 0), 0) + 1;
  }

  private persist(): void {
    if (!this.canUseLocalStorage()) {
      return;
    }

    localStorage.setItem(
      this.storageKey,
      JSON.stringify({
        courts: this.courts,
        schedules: this.schedules,
        bookings: this.bookings,
        payments: this.payments,
      }),
    );
  }

  private readState():
    | {
        courts: Court[];
        schedules: CourtSchedule[];
        bookings: Booking[];
        payments: Payment[];
      }
    | undefined {
    if (!this.canUseLocalStorage()) {
      return undefined;
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(this.storageKey);
      return undefined;
    }
  }

  private replaceArray<T>(target: T[], source: T[]): void {
    target.splice(0, target.length, ...this.clone(source));
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private canUseLocalStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
