import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodItem } from "@/lib/food-nutrition";

const numeric = (value: string) => value.replace(/[^0-9.,]/g, "").replace(",", ".");
type ScanPhase = "idle" | "choosing" | "uploading" | "extracting" | "success" | "error";

const errorCopy = (error: unknown) => {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("timeout") || raw.includes("502") || raw.includes("503")) return "לא הצלחנו להתחבר לשירות החילוץ. בדוק את החיבור לאינטרנט ונסה שוב.";
  if (raw.includes("image") || raw.includes("base64") || raw.includes("format") || raw.includes("payload") || raw.includes("size")) return "התמונה לא נקראה כראוי. נסה צילום חד יותר של טבלת הערכים, ללא חיתוך או השתקפות.";
  if (raw.includes("429") || raw.includes("limit")) return "השירות עמוס כרגע. המתן כמה שניות ונסה שוב.";
  return "לא הצלחנו לחלץ את הערכים מהתווית. ודא שטבלת הערכים גלויה וברורה ונסה שוב.";
};

export default function FoodLabelScreen() {
  const { nutritionProfile, updateNutritionProfile } = useWorkoutStore();
  const extract = trpc.foodLabel.useMutation();
  const [imageUri, setImageUri] = useState("");
  const [lastBase64, setLastBase64] = useState("");
  const [lastMimeType, setLastMimeType] = useState("image/jpeg");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [fats, setFats] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");

  const isBusy = phase === "choosing" || phase === "uploading" || phase === "extracting" || extract.isPending;
  const phaseLabel = phase === "choosing" ? "פותח את בחירת התמונות…" : phase === "uploading" ? "מכין את התמונה לחילוץ…" : phase === "extracting" ? "מנתח את טבלת הערכים…" : "";

  const extractFromBase64 = async (base64: string, mimeType: string, uri: string) => {
    setErrorMessage("");
    setMessage("");
    setPhase("uploading");
    await new Promise((resolve) => setTimeout(resolve, 180));
    setPhase("extracting");
    const extracted = await extract.mutateAsync({ imageDataUrl: `data:${mimeType || "image/jpeg"};base64,${base64}` });
    const factor = extracted.servingGrams > 0 ? 100 / extracted.servingGrams : 1;
    setImageUri(uri);
    setName(extracted.name);
    setBrand(extracted.brand);
    setCalories(String(Math.round(extracted.calories * factor * 10) / 10));
    setProtein(String(Math.round(extracted.protein * factor * 10) / 10));
    setCarbohydrates(String(Math.round(extracted.carbohydrates * factor * 10) / 10));
    setFats(String(Math.round(extracted.fats * factor * 10) / 10));
    setConfidence(extracted.confidence);
    setNote(extracted.note);
    setMessage("החילוץ הושלם. בדוק את הערכים מול האריזה לפני שמירה.");
    setPhase("success");
  };

  const chooseLabel = async () => {
    if (isBusy) return;
    setErrorMessage("");
    setMessage("");
    setPhase("choosing");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, base64: true });
      if (result.canceled) { setPhase("idle"); setMessage("בחירת התמונה בוטלה. אפשר לנסות שוב בכל עת."); return; }
      const asset = result.assets[0];
      const base64 = asset.base64 ?? await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLastBase64(base64);
      setLastMimeType(asset.mimeType || "image/jpeg");
      await extractFromBase64(base64, asset.mimeType || "image/jpeg", asset.uri);
    } catch (error) {
      setPhase("error");
      setErrorMessage(errorCopy(error));
    }
  };

  const retryExtraction = async () => {
    if (!lastBase64 || isBusy) return;
    try { await extractFromBase64(lastBase64, lastMimeType, imageUri); } catch (error) { setPhase("error"); setErrorMessage(errorCopy(error)); }
  };

  const saveFood = () => {
    if (!name.trim() || !calories.trim()) { setErrorMessage("כדי לשמור, יש להזין לפחות שם מוצר וקלוריות ל־100 גרם."); return; }
    const item: FoodItem = { id: `ai-food-${Date.now()}`, name: name.trim(), brand: brand.trim() || undefined, group: "חלבון", reference: "חולץ מתווית · יש לאמת מול האריזה", servingGrams: 100, calories: Number(calories) || 0, protein: Number(protein) || 0, carbohydrates: Number(carbohydrates) || 0, fats: Number(fats) || 0 };
    updateNutritionProfile({ ...nutritionProfile, customFoods: [item, ...(nutritionProfile.customFoods ?? [])] });
    setErrorMessage("");
    setMessage("המוצר נשמר במאגר האישי לפי 100 גרם.");
    setPhase("success");
  };

  return <ScreenContainer className="px-5 pt-5"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.header}><Text style={styles.eyebrow}>כלי חכם לתזונה</Text><Text style={styles.title}>חילוץ תווית מזון</Text><Text style={styles.subtitle}>העלה תמונה ברורה של טבלת הערכים. המערכת תחלץ נתונים, ואתה מאמת אותם לפני שמירה.</Text></View><View style={styles.card}><Pressable accessibilityRole="button" accessibilityLabel="בחר תמונה של תווית מזון" accessibilityState={{ disabled: isBusy, busy: isBusy }} disabled={isBusy} onPress={() => void chooseLabel()} style={({ pressed }) => [styles.primary, isBusy && styles.disabled, pressed && !isBusy && styles.pressed]}><Text style={styles.primaryText}>{isBusy ? "מעבד את התווית…" : "בחר תמונה וחלץ ערכים"}</Text></Pressable>{isBusy ? <View accessibilityLiveRegion="polite" style={styles.loadingBox}><ActivityIndicator color="#F5B72C" size="small" /><View style={styles.loadingText}><Text style={styles.loadingTitle}>{phaseLabel}</Text><Text style={styles.loadingHint}>אין לסגור את המסך עד לסיום התהליך</Text></View></View> : null}{phase === "error" ? <View accessibilityLiveRegion="assertive" style={styles.errorBox}><Text style={styles.errorTitle}>החילוץ לא הושלם</Text><Text style={styles.errorText}>{errorMessage}</Text><View style={styles.errorActions}>{lastBase64 ? <Pressable accessibilityRole="button" accessibilityLabel="נסה לחלץ שוב" onPress={() => void retryExtraction()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text style={styles.retryText}>נסה שוב</Text></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel="בחר תמונה אחרת" onPress={() => void chooseLabel()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={styles.secondaryText}>בחר תמונה אחרת</Text></Pressable></View></View> : null}{phase === "success" && !isBusy ? <View accessibilityLiveRegion="polite" style={styles.successBox}><Text style={styles.successTitle}>התמונה נותחה בהצלחה</Text><Text style={styles.successText}>הערכים מוצגים לפי 100 גרם. בדוק אותם לפני שמירה.</Text></View> : null}{imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}<Text style={styles.disclaimer}>החילוץ האוטומטי אינו מקור מוסמך. יש לבדוק את הערכים מול תווית המוצר, במיוחד לפני שימוש רפואי או תזונתי משמעותי.</Text></View><View style={styles.card}><Text style={styles.section}>אימות ועריכה לפני שמירה</Text><Field label="שם מוצר" value={name} onChangeText={setName} /><Field label="מותג" value={brand} onChangeText={setBrand} /><View style={styles.grid}><Field label="קלוריות ל־100 גרם" value={calories} onChangeText={(v) => setCalories(numeric(v))} /><Field label="חלבון ל־100 גרם" value={protein} onChangeText={(v) => setProtein(numeric(v))} /><Field label="פחמימות ל־100 גרם" value={carbohydrates} onChangeText={(v) => setCarbohydrates(numeric(v))} /><Field label="שומן ל־100 גרם" value={fats} onChangeText={(v) => setFats(numeric(v))} /></View>{confidence !== null ? <Text style={styles.confidence}>רמת ביטחון בחילוץ: {Math.round(confidence * 100)}%</Text> : null}{note ? <Text style={styles.note}>{note}</Text> : null}<Pressable accessibilityRole="button" accessibilityLabel="שמור מוצר שחולץ למאגר האישי" onPress={saveFood} style={({ pressed }) => [styles.save, pressed && styles.pressed]}><Text style={styles.saveText}>שמור במאגר האישי</Text></Pressable>{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}{errorMessage && phase !== "error" ? <Text accessibilityLiveRegion="assertive" style={styles.inlineError}>{errorMessage}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel="חזור לתזונה" onPress={() => router.replace("/(tabs)/nutrition" as never)} style={styles.back}><Text style={styles.backText}>חזרה למסך התזונה</Text></Pressable></ScrollView></ScreenContainer>;
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder="—" placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" keyboardType="decimal-pad" /></View>; }

const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 35 }, header: { gap: 6, alignItems: "flex-end" }, eyebrow: { color: "#F5B72C", fontWeight: "900" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 18 }, card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 }, primary: { backgroundColor: "#F5B72C", borderRadius: 11, minHeight: 48, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#0B1224", fontWeight: "900" }, disabled: { opacity: 0.58 }, loadingBox: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#243B61", borderColor: "#5D8DC1", borderWidth: 1, borderRadius: 12, padding: 11 }, loadingText: { flex: 1, gap: 2 }, loadingTitle: { color: "#F5B72C", fontWeight: "900", textAlign: "right" }, loadingHint: { color: "#D9E2EF", fontSize: 10, textAlign: "right" }, errorBox: { backgroundColor: "#3A1E2B", borderColor: "#F16B7A", borderWidth: 1, borderRadius: 12, padding: 12, gap: 7 }, errorTitle: { color: "#FF9AAA", fontWeight: "900", textAlign: "right" }, errorText: { color: "#FFE2E6", fontSize: 11, lineHeight: 17, textAlign: "right" }, errorActions: { flexDirection: "row-reverse", gap: 8 }, retryButton: { backgroundColor: "#F5B72C", borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 }, retryText: { color: "#0B1224", fontWeight: "900" }, secondaryButton: { borderColor: "#FF9AAA", borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }, secondaryText: { color: "#FFE2E6", fontWeight: "800" }, successBox: { backgroundColor: "#163B35", borderColor: "#42D392", borderWidth: 1, borderRadius: 12, padding: 11, gap: 3 }, successTitle: { color: "#65E5AA", fontWeight: "900", textAlign: "right" }, successText: { color: "#D8FFEC", fontSize: 10, textAlign: "right" }, preview: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#0B1224" }, disclaimer: { color: "#AAB7C8", fontSize: 10, lineHeight: 16, textAlign: "right" }, section: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" }, grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, field: { flex: 1, minWidth: "46%", gap: 4 }, label: { color: "#D9E2EF", fontSize: 10, fontWeight: "800", textAlign: "right" }, input: { color: "#F7F9FC", backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, minHeight: 43, paddingHorizontal: 10 }, confidence: { color: "#42D392", fontWeight: "900", textAlign: "right" }, note: { color: "#F5B72C", fontSize: 11, lineHeight: 17, textAlign: "right" }, save: { backgroundColor: "#42D392", borderRadius: 10, minHeight: 46, alignItems: "center", justifyContent: "center" }, saveText: { color: "#0B1224", fontWeight: "900" }, message: { color: "#D9EEFF", fontSize: 11, lineHeight: 17, textAlign: "right" }, inlineError: { color: "#FF9AAA", fontSize: 11, lineHeight: 17, textAlign: "right" }, back: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" }, backText: { color: "#AAB7C8", fontWeight: "800" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
