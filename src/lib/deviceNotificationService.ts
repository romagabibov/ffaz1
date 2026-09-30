/**
 * Device Shade / Native System Push Notification Service
 * Sends notifications directly into the user's mobile/desktop notification shade
 * (Android notification center, iOS lock screen / PWA shade, Windows/macOS notification tray)
 * just like WhatsApp, Telegram, or Instagram.
 */

import { playMessageReceivedSound, playNotificationSound } from './soundEffects';

export interface DeviceNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  vibrate?: number[];
  silent?: boolean;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register Service Worker for native device notifications
 */
export async function initDeviceNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = registration;
    return registration;
  } catch (err) {
    console.warn('[DeviceNotification] Service Worker registration notice:', err);
    return null;
  }
}

/**
 * Check current device notification permission status
 */
export function getDeviceNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request permission from user to send notifications to device notification shade
 */
export async function requestDeviceNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Send a welcome verification notification in device shade
      showDeviceNotification({
        title: 'FFAZ Direct & Community',
        body: 'Уведомления в шторку устройства успешно включены! Вы будете получать сообщения как в WhatsApp и Telegram.',
        tag: 'ffaz-welcome',
        url: '/messages'
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[DeviceNotification] Permission request notice:', err);
    return false;
  }
}

/**
 * Send a native notification directly to the device's notification shade
 */
export async function showDeviceNotification(options: DeviceNotificationOptions): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const {
    title,
    body,
    icon = '/icon.svg',
    badge = '/icon.svg',
    tag = `ffaz_msg_${Date.now()}`,
    url = '/messages',
    vibrate = [200, 100, 200],
    silent = false
  } = options;

  if (!silent) {
    playMessageReceivedSound();
  }

  try {
    // 1. Try displaying via Service Worker (preferred for Android / Mobile PWA shade)
    if ('serviceWorker' in navigator) {
      if (!swRegistration) {
        swRegistration = await navigator.serviceWorker.ready.catch(() => null);
      }
      if (swRegistration && 'showNotification' in swRegistration) {
        await swRegistration.showNotification(title, {
          body,
          icon,
          badge,
          tag,
          vibrate,
          data: { url, timestamp: Date.now() }
        } as any);
        return;
      }
    }

    // 2. Fallback to standard Window Notification API (Desktop / Browser)
    const notif = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url }
    });

    notif.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notif.close();
    };
  } catch (err) {
    console.warn('[DeviceNotification] Failed to display native notification:', err);
  }
}
