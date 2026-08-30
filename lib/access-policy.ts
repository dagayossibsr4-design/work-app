export function existingUserOtpOptions(emailRedirectTo: string) {
  return {
    emailRedirectTo,
    shouldCreateUser: false as const,
  };
}

export const NEW_USER_ACCESS_MESSAGE =
  "משתמש חדש צריך לבחור מסלול, לבצע תשלום ולקבל אישור מנהל לפני יצירת החשבון.";
