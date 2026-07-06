import { Routes } from '@angular/router';
import { BookingDetail } from './pages/admin/booking-detail/booking-detail';
import { BookingsList } from './pages/admin/bookings-list/bookings-list';
import { CourtForm } from './pages/admin/court-form/court-form';
import { CourtSchedules } from './pages/admin/court-schedules/court-schedules';
import { CourtsList } from './pages/admin/courts-list/courts-list';
import { Dashboard } from './pages/admin/dashboard/dashboard';
import { PaymentDetail } from './pages/admin/payment-detail/payment-detail';
import { PaymentsList } from './pages/admin/payments-list/payments-list';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { ClientBookingDetail } from './pages/client/client-booking-detail/client-booking-detail';
import { ClientBookings } from './pages/client/client-bookings/client-bookings';
import { ClientCourtDetail } from './pages/client/client-court-detail/client-court-detail';
import { ClientHome } from './pages/client/client-home/client-home';
import { ClientPayment } from './pages/client/client-payment/client-payment';
import { ClientTeams } from './pages/client/client-teams/client-teams';
import { ChallengeBooking } from './pages/client/challenge-booking/challenge-booking';
import { ConfirmBooking } from './pages/client/confirm-booking/confirm-booking';
import { ReceivedChallenges } from './pages/client/received-challenges/received-challenges';
import { SendChallenge } from './pages/client/send-challenge/send-challenge';
import { SentChallenges } from './pages/client/sent-challenges/sent-challenges';
import { TeamChallengeSearch } from './pages/client/team-challenge-search/team-challenge-search';
import { TeamDetail } from './pages/client/team-detail/team-detail';
import { TeamForm } from './pages/client/team-form/team-form';
import { TeamSearch } from './pages/client/team-search/team-search';
import { AdminShell } from './shared/admin-shell/admin-shell';
import { ClientShell } from './shared/client-shell/client-shell';
import { adminGuard, clientGuard } from './core/auth.guard';
import { Settings } from './pages/shared/settings/settings';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  { path: 'registro', component: Register },
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: Dashboard },
      { path: 'canchas', component: CourtsList },
      { path: 'canchas/nueva', component: CourtForm },
      { path: 'canchas/editar', component: CourtForm },
      { path: 'canchas/:id/editar', component: CourtForm },
      { path: 'canchas/:id/horarios', component: CourtSchedules },
      { path: 'horarios', component: CourtSchedules },
      { path: 'reservas', component: BookingsList },
      { path: 'reservas/:id', component: BookingDetail },
      { path: 'pagos', component: PaymentsList },
      { path: 'pagos/:id', component: PaymentDetail },
      { path: 'configuracion', component: Settings },
    ],
  },
  {
    path: 'cliente',
    component: ClientShell,
    canActivate: [clientGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', component: ClientHome },
      { path: 'canchas/:id', component: ClientCourtDetail },
      { path: 'reservar', component: ConfirmBooking },
      { path: 'reservas', component: ClientBookings },
      { path: 'reservas/:id', component: ClientBookingDetail },
      { path: 'reservas/:id/pagar', component: ClientPayment },
      { path: 'equipos', component: ClientTeams },
      { path: 'equipos/buscar', component: TeamSearch },
      { path: 'equipos/nuevo', component: TeamForm },
      { path: 'equipos/retar', component: TeamChallengeSearch },
      { path: 'equipos/retar/:id', component: SendChallenge },
      { path: 'equipos/retos/recibidos', component: ReceivedChallenges },
      { path: 'equipos/retos/enviados', component: SentChallenges },
      { path: 'equipos/retos/enviados/:id/reservar', component: ChallengeBooking },
      { path: 'equipos/:id', component: TeamDetail },
      { path: 'configuracion', component: Settings },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
