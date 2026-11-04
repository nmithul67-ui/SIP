// tablet/src/services/FieldTelemetry.ts
/**
 * Lightweight on-device telemetry logger for Phase?5.
 * Collects key operational metrics without requiring internet.
 * Metrics are persisted to local storage (AsyncStorage) and can be
 * exported via a single POST when connectivity is restored.
 */
import AsyncStorage from  @react-native-async-storage/async-storage;
import { AppState } from react-native;

export interface TelemetryEvent {
  timestamp: number;
  type: string;
  payload: Record<string, any>;
}

class FieldTelemetry {
  private static instance: FieldTelemetry;
  private events: TelemetryEvent[] = [];
  private readonly STORAGE_KEY = field_telemetry_events;

  private constructor() {
    // Load persisted events on startup
    this.loadPersisted();
    // Flush when app goes to background
    AppState.addEventListener(change, this.handleAppStateChange);
  }

  public static getInstance(): FieldTelemetry {
    if (!FieldTelemetry.instance) {
      FieldTelemetry.instance = new FieldTelemetry();
    }
    return FieldTelemetry.instance;
  }

  private handleAppStateChange = (nextState: string) => {
    if (nextState === background) {
      this.persist();
    }
  };

  /** Record a telemetry event */
  public record(type: string, payload: Record<string, any> = {}): void {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      type,
      payload,
    };
    this.events.push(event);
  }

  /** Get a snapshot of current events */
  public getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /** Persist events to AsyncStorage */
  public async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events));
    } catch (e) {
      console.warn(FieldTelemetry persist error:, e);
    }
  }

  /** Load persisted events (if any) */
  private async loadPersisted(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.events = JSON.parse(raw);
      }
    } catch (e) {
      console.warn(FieldTelemetry load error:, e);
    }
  }

  /** Export stored telemetry to the backend when online */
  public async exportIfConnected(): Promise<void> {
    const isConnected = await this.checkConnectivity();
    if (!isConnected) return;
    const events = this.getEvents();
    if (events.length === 0) return;
    try {
      await fetch(http://localhost:8000/api/v1/telemetry/sync, {
        method: POST,
        headers: { Content-Type: application/json },
        body: JSON.stringify({ events }),
      });
      // Clear after successful upload
      this.events = [];
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn(FieldTelemetry export failed:, e);
    }
  }

  /** Simple connectivity check – replace with real NetInfo implementation */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const resp = await fetch(https://www.google.com, { method: HEAD });
      return resp.ok;
    } catch {
      return false;
    }
  }
}

export default FieldTelemetry.getInstance();
