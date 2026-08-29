/**
 * @file googleCalendar.ts
 * @description Utilitário para geração de URLs universais do Google Agenda no formato RFC 5545,
 * permitindo ao usuário abrir e salvar compromissos com data, horário, título e notas pré-preenchidos.
 */

interface GoogleCalendarOptions {
  /** Título principal do compromisso ou tarefa */
  title: string;
  /** Descrição detalhada ou notas adicionais */
  description?: string | null;
  /** Data do compromisso (ISO string ou objeto Date) */
  dueDate?: string | Date | null;
  /** Horário específico no formato "HH:mm" (ex: "14:30") */
  dueTime?: string | null;
  /** Localização física ou link de reunião online (opcional) */
  location?: string | null;
}

/**
 * Constrói a URL oficial de criação de eventos web do Google Agenda.
 *
 * @param options Propriedades do evento a ser agendado
 * @returns Link completo `https://calendar.google.com/calendar/render?...`
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  dueDate,
  dueTime,
  location,
}: GoogleCalendarOptions): string {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const cleanTitle = encodeURIComponent(title || "Tarefa no Life OS");
  const detailsText = description ? `${description}\n\nGerenciado via Life OS` : "Gerenciado via Life OS";
  const cleanDetails = encodeURIComponent(detailsText);
  const cleanLocation = location ? encodeURIComponent(location) : "";

  let datesParam = "";

  if (dueDate) {
    const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    if (dueTime && dueTime.includes(":")) {
      const [hours, minutes] = dueTime.split(":");
      const startHours = String(hours).padStart(2, "0");
      const startMinutes = String(minutes).padStart(2, "0");
      // Duração padrão estimada de 1 hora
      const endHours = String(Math.min(Number(hours) + 1, 23)).padStart(2, "0");

      // Formato padrão Google Calendar: YYYYMMDDTHHmm00
      const startStr = `${year}${month}${day}T${startHours}${startMinutes}00`;
      const endStr = `${year}${month}${day}T${endHours}${startMinutes}00`;
      datesParam = `&dates=${startStr}/${endStr}`;
    } else {
      // Evento de dia inteiro: YYYYMMDD/YYYYMMDD (dia seguinte)
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextYear = nextDay.getFullYear();
      const nextMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
      const nextDayStr = String(nextDay.getDate()).padStart(2, "0");

      datesParam = `&dates=${year}${month}${day}/${nextYear}${nextMonth}${nextDayStr}`;
    }
  }

  return `${baseUrl}&text=${cleanTitle}&details=${cleanDetails}${datesParam}${cleanLocation ? `&location=${cleanLocation}` : ""}`;
}
