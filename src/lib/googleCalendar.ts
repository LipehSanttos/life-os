/**
 * Helper to generate official Google Calendar Event Web Links
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  dueDate,
  dueTime,
  location,
}: {
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  dueTime?: string | null;
  location?: string | null;
}): string {
  const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";

  const cleanTitle = encodeURIComponent(title || "Tarefa no Life OS");
  let detailsText = description ? `${description}\n\nCriado via Life OS` : "Gerenciado via Life OS";
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
      const endHours = String(Math.min(Number(hours) + 1, 23)).padStart(2, "0");

      // Format: YYYYMMDDTHHmm00
      const startStr = `${year}${month}${day}T${startHours}${startMinutes}00`;
      const endStr = `${year}${month}${day}T${endHours}${startMinutes}00`;
      datesParam = `&dates=${startStr}/${endStr}`;
    } else {
      // All day event: YYYYMMDD/YYYYMMDD
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

