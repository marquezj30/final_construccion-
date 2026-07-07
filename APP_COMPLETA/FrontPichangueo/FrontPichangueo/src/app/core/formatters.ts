type AppLanguage = 'es' | 'en' | 'pt';

const labels = {
  es: {
    days: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
    booking: { pending: 'Pendiente', approved: 'Aprobada', cancelled: 'Cancelada' },
    paymentStatus: { approved: 'Aprobado', pending_review: 'Pendiente revision', rejected: 'Rechazado' },
    paymentType: { advance: 'Adelanto', full: 'Completo', balance: 'Saldo' },
  },
  en: {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    booking: { pending: 'Pending', approved: 'Approved', cancelled: 'Cancelled' },
    paymentStatus: { approved: 'Approved', pending_review: 'Pending review', rejected: 'Rejected' },
    paymentType: { advance: 'Advance', full: 'Full', balance: 'Balance' },
  },
  pt: {
    days: ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'],
    booking: { pending: 'Pendente', approved: 'Aprovada', cancelled: 'Cancelada' },
    paymentStatus: { approved: 'Aprovado', pending_review: 'Revisao pendente', rejected: 'Rejeitado' },
    paymentType: { advance: 'Adiantamento', full: 'Completo', balance: 'Saldo' },
  },
} as const;

function currentLanguage(): AppLanguage {
  const value = localStorage.getItem('pichangueo_language');
  return value === 'en' || value === 'pt' ? value : 'es';
}

export const dayNames = new Proxy(labels.es.days, {
  get(_target, property) {
    if (property === 'length') return labels.es.days.length;
    const index = Number(property);
    if (Number.isInteger(index)) return labels[currentLanguage()].days[index];
    return Reflect.get(labels.es.days, property);
  },
}) as unknown as string[];

export function timeLabel(value: string): string {
  return value.slice(0, 5);
}

export function bookingStatusLabel(status: string): string {
  return labels[currentLanguage()].booking[status as keyof typeof labels.es.booking] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return labels[currentLanguage()].paymentStatus[status as keyof typeof labels.es.paymentStatus] ?? status;
}

export function paymentTypeLabel(type: string): string {
  return labels[currentLanguage()].paymentType[type as keyof typeof labels.es.paymentType] ?? type;
}
