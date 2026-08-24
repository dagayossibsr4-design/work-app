/**
 * גרסת Web בטוחה: Health Connect הוא שירות Android מקומי ואינו זמין באתר.
 * הפונקציות נשארות קיימות כדי שמסכים אחרים ימשיכו לעבוד בלי שגיאת בנייה.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  return false;
}

export async function fetchSamsungHealthData() {
  return {
    success: false,
    message: "סנכרון שעון אינו זמין בגרסת האתר. ניתן להשתמש בשאר כלי התזונה והאימונים כרגיל.",
  };
}
