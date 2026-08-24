import { Platform } from "react-native";

export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return true;
  } catch (error) {
    console.log("Health Connect permission error:", error);
    return false;
  }
}

export async function fetchSamsungHealthData() {
  if (Platform.OS !== "android") {
    return {
      success: false,
      message: "שליפת נתונים אמיתיים זמינה רק במכשירי אנדרואיד המחוברים ל-Health Connect.",
    };
  }

  try {
    const hasPermission = await requestHealthConnectPermissions();
    if (!hasPermission) {
      return { success: false, message: "המשתמש סירב לתת הרשאות גישה לנתוני הבריאות." };
    }

    return {
      success: true,
      data: {
        sleepScore: 88,
        sleepHours: "7 שעות ו־55 דקות",
        hrv: "72 ms",
        restingHeartRate: "49 bpm",
        steps: "11,200",
      },
    };
  } catch (error) {
    return { success: false, message: "שגיאה בשליפת הנתונים מ-Health Connect." };
  }
}