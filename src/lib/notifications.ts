/**
 * @file notifications.ts
 * @description Utilitário de notificações web do navegador (Web Notifications API)
 * para alertar sobre tarefas vencendo e lembretes financeiros.
 */

/**
 * Solicita permissão ao usuário para emitir notificações na área de trabalho do navegador.
 */
export function requestBrowserNotificationPermission(): void {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

/**
 * Dispara uma notificação nativa do navegador se a permissão tiver sido concedida.
 *
 * @param title Título do alerta da notificação
 * @param options Opções adicionais como corpo da mensagem e ícone
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    } catch (e) {
      console.warn("Falha ao enviar notificação do navegador:", e);
    }
  }
}
