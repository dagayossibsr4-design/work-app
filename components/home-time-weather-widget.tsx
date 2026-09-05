import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { APP_TIME_ZONE } from "@/lib/calendar-grid";

type HomeTimeWeatherWidgetProps = {
  isSignedIn: boolean;
  onLogout: () => void;
  onSignIn: () => void;
};

// Tel Aviv - used when the browser has no geolocation permission/support, so
// the widget still shows something useful instead of nothing.
const FALLBACK_COORDS = { latitude: 32.0853, longitude: 34.7818 };
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

type WeatherState = { temperatureC: number; icon: string; description: string } | null;

// WMO weather codes (https://open-meteo.com/en/docs) collapsed into the
// handful of icon/description buckets relevant to a small home-screen widget.
function describeWeatherCode(code: number): { icon: string; description: string } {
  if (code === 0) return { icon: "☀️", description: "בהיר" };
  if (code === 1 || code === 2) return { icon: "🌤️", description: "מעונן חלקית" };
  if (code === 3) return { icon: "☁️", description: "מעונן" };
  if (code === 45 || code === 48) return { icon: "🌫️", description: "ערפילי" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", description: "טפטוף" };
  if (code >= 61 && code <= 67) return { icon: "🌧️", description: "גשום" };
  if (code >= 71 && code <= 77) return { icon: "❄️", description: "שלג" };
  if (code >= 80 && code <= 82) return { icon: "🌧️", description: "ממטרים" };
  if (code >= 85 && code <= 86) return { icon: "🌨️", description: "ממטרי שלג" };
  if (code >= 95) return { icon: "⛈️", description: "סופת רעמים" };
  return { icon: "🌡️", description: "מזג אוויר" };
}

function getCoords(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve) => {
    if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(FALLBACK_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(FALLBACK_COORDS),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

export function HomeTimeWeatherWidget({ isSignedIn, onLogout, onSignIn }: HomeTimeWeatherWidgetProps) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherState>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const loadWeather = async () => {
      try {
        const { latitude, longitude } = await getCoords();
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = (await response.json()) as { current_weather?: { temperature?: number; weathercode?: number } };
        const temperatureC = data.current_weather?.temperature;
        const code = data.current_weather?.weathercode ?? 0;
        if (typeof temperatureC !== "number" || !mountedRef.current) return;
        setWeather({ temperatureC, ...describeWeatherCode(code) });
      } catch {
        // Weather is a nice-to-have on this widget - a failed fetch just
        // leaves the date/time showing on their own.
      }
    };
    void loadWeather();
    const timer = setInterval(loadWeather, WEATHER_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, []);

  const dateLabel = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: APP_TIME_ZONE,
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).format(now);

  return (
    <View style={styles.card}>
      <View style={styles.dateBlock}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.time}>{timeLabel}</Text>
      </View>
      <View style={styles.rightGroup}>
        {weather ? (
          <View style={styles.weatherBlock}>
            <Text style={styles.weatherIcon}>{weather.icon}</Text>
            <View>
              <Text style={styles.weatherTemp}>{Math.round(weather.temperatureC)}°</Text>
              <Text style={styles.weatherDescription}>{weather.description}</Text>
            </View>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSignedIn ? "התנתקות מהחשבון המחובר" : "הרשמה או התחברות"}
          onPress={isSignedIn ? onLogout : onSignIn}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <Text style={styles.logoutButtonText}>{isSignedIn ? "התנתק" : "כניסה"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16233A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dateBlock: { alignItems: "flex-end", minWidth: 0, flexShrink: 1 },
  date: { color: "#C6D2E2", fontSize: 12, fontWeight: "700", textAlign: "right" },
  time: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", marginTop: 2, textAlign: "right" },
  // row-reverse here too: weatherBlock (first child) lands closer to the
  // date/time side, logoutButton (second child) ends up furthest left.
  rightGroup: { flexDirection: "row-reverse", alignItems: "center", gap: 10, flexShrink: 0 },
  weatherBlock: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexShrink: 0 },
  weatherIcon: { fontSize: 26 },
  weatherTemp: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  weatherDescription: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  logoutButton: { borderColor: "#3F76A7", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#0F1B31" },
  logoutButtonText: { color: "#A9CFF2", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
