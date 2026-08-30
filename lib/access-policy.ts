export function existingUserOtpOptions(emailRedirectTo: string) {
  return {
    emailRedirectTo,
    shouldCreateUser: false as const,
  };
}

export const NEW_USER_ACCESS_MESSAGE =
  "משתמש חדש צריך לבחור מסלול, לבצע תשלום ולקבל אישור מנהל לפני יצירת החשבון.";

export function validateExistingUserLogin(email: string, password: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return "הזן כתובת דוא״ל תקינה כדי להתחבר לחשבון האישי.";
  if (!password) return "הזן סיסמה כדי להתחבר לחשבון האישי.";
  return null;
}
