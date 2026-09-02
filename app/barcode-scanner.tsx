import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodItem } from "@/lib/food-nutrition";
import { trpc } from "@/lib/trpc";

const barcodeTypes = ["ean13", "ean8", "upc_a", "code128"] as const;

export default function BarcodeScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [foundProduct, setFoundProduct] = useState<{
    barcode: string;
    name: string;
    brand: string;
    servingSize: string;
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fats: number | null;
  } | null>(null);
  const { updateNutritionProfile } = useWorkoutStore();
  const lookup = trpc.barcodeLookup.useMutation({
    onSuccess: (result) => {
      if (!result.found) {
        setMessage("המוצר לא נמצא במאגר. אפשר לנסות צילום תווית או להזין מוצר ידנית.");
        return;
      }
      setFoundProduct({ barcode: result.barcode, name: result.name || "מוצר ללא שם", brand: result.brand || "", servingSize: result.servingSize || "", calories: result.calories, protein: result.protein, carbohydrates: result.carbohydrates, fats: result.fats });
      const macroMessage = result.calories !== null || result.protein !== null || result.carbohydrates !== null || result.fats !== null
        ? `קלוריות: ${result.calories ?? "—"} · חלבון: ${result.protein ?? "—"} ג׳ · פחמימות: ${result.carbohydrates ?? "—"} ג׳ · שומן: ${result.fats ?? "—"} ג׳ ל־100 ג׳`
        : "נמצא מוצר, אך חסרים בו ערכי תזונה מלאים.";
      setMessage(`${result.name || "מוצר ללא שם"}${result.brand ? ` · ${result.brand}` : ""}\n${macroMessage}`);
    },
    onError: () => setMessage("לא ניתן להשלים את חיפוש הברקוד כרגע. בדוק חיבור לאינטרנט או נסה שוב."),
  });

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanned || lookup.isPending) return;
    const normalized = data.replace(/[-\s]/g, "");
    if (!/^[0-9]{6,32}$/.test(normalized)) {
      setMessage("הברקוד זוהה אך אינו בפורמט מוצר נתמך.");
      return;
    }
    setScanned(true);
    setBarcode(normalized);
    setMessage("הברקוד נקלט. מחפש את המוצר…");
    lookup.mutate({ barcode: normalized });
  };

  const saveFoundProduct = () => {
    if (!foundProduct) return;
    const calories = foundProduct.calories ?? 0;
    const protein = foundProduct.protein ?? 0;
    const carbohydrates = foundProduct.carbohydrates ?? 0;
    const fats = foundProduct.fats ?? 0;
    const fatLevel = fats <= 5 ? "דל שומן" as const : fats <= 15 ? "בינוני" as const : "שומני" as const;
    const product: FoodItem = {
      id: `barcode-${foundProduct.barcode}`,
      name: foundProduct.name,
      group: "שונות",
      subgroup: "שונות",
      reference: `Open Food Facts · ${foundProduct.servingSize || "ערכים ל־100 ג׳"}`,
      servingGrams: 100,
      calories,
      protein,
      carbohydrates,
      fats,
      brand: foundProduct.brand || undefined,
      barcode: foundProduct.barcode,
      fatLevel,
      sourceType: "אישי",
    };
    updateNutritionProfile((current) => {
      const foods = current.customFoods ?? [];
      const existingIndex = foods.findIndex((item) => item.barcode === product.barcode);
      const nextFoods = existingIndex >= 0 ? foods.map((item, index) => index === existingIndex ? { ...item, ...product } : item) : [product, ...foods];
      return { ...current, customFoods: nextFoods, customFoodsUpdatedAt: Date.now() };
    });
    setMessage(`המוצר ${product.name} נשמר במאגר האישי ויופיע בחיפוש ובארוחות.`);
  };

  const searchTypedBarcode = () => {
    const normalized = barcode.replace(/[-\s]/g, "");
    if (!/^[0-9]{6,32}$/.test(normalized)) {
      setMessage("יש להזין מספר ברקוד תקין.");
      return;
    }
    setScanned(true);
    setMessage("מחפש את המוצר…");
    lookup.mutate({ barcode: normalized });
  };

  if (!permission) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#F5B72C" /></ScreenContainer>;

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ חזרה לתזונה</Text></Pressable>
          <Text style={styles.eyebrow}>סריקה מהירה</Text>
          <Text style={styles.title}>סריקת ברקוד</Text>
          <Text style={styles.subtitle}>כוון את המצלמה לברקוד שעל מוצר ארוז. לאחר הזיהוי נחפש את המוצר ונציג את הערכים הזמינים.</Text>
        </View>

        {!permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>נדרשת גישה למצלמה</Text>
            <Text style={styles.permissionText}>אשר גישה כדי לסרוק ברקודים דרך המכשיר או דרך Preview בדפדפן.</Text>
            <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>אישור גישה למצלמה</Text></Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View pointerEvents="none" style={styles.scanFrame}><View style={styles.cornerTopRight} /><View style={styles.cornerTopLeft} /><View style={styles.cornerBottomRight} /><View style={styles.cornerBottomLeft} /></View>
            <Text style={styles.cameraHint}>{scanned ? "הברקוד נקלט" : "מקם את הברקוד בתוך המסגרת"}</Text>
          </View>
        )}

        <View style={styles.manualBox}>
          <Text style={styles.manualTitle}>או הזן ברקוד ידנית</Text>
          <TextInput value={barcode} onChangeText={setBarcode} placeholder="למשל 7290012345678" placeholderTextColor="#7E8DA4" keyboardType="number-pad" style={styles.input} textAlign="right" />
          <Pressable accessibilityRole="button" onPress={searchTypedBarcode} disabled={lookup.isPending} style={({ pressed }) => [styles.secondary, lookup.isPending && styles.disabled, pressed && styles.pressed]}><Text style={styles.secondaryText}>{lookup.isPending ? "מחפש…" : "חפש מוצר לפי ברקוד"}</Text></Pressable>
        </View>

        {lookup.isPending ? <View style={styles.statusBox}><ActivityIndicator color="#F5B72C" /><Text style={styles.statusText}>מחפש מוצר במאגר…</Text></View> : null}
        {message ? <View style={styles.resultBox}><Text style={styles.resultText}>{message}</Text>{foundProduct ? <Pressable accessibilityRole="button" onPress={saveFoundProduct} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveButtonText}>שמור במאגר האישי</Text></Pressable> : null}</View> : null}

        <View style={styles.fallbackBox}>
          <Text style={styles.fallbackTitle}>לא נמצא מוצר?</Text>
          <Text style={styles.fallbackText}>אפשר להמשיך לצילום תווית הערכים או להזנה ידנית, בלי לאבד את הסריקה.</Text>
          <View style={styles.fallbackActions}>
            <Pressable accessibilityRole="button" onPress={() => router.push("/food-label" as never)} style={({ pressed }) => [styles.fallbackButton, pressed && styles.pressed]}><Text style={styles.fallbackButtonText}>צילום תווית</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setScanned(false)} style={({ pressed }) => [styles.fallbackButton, pressed && styles.pressed]}><Text style={styles.fallbackButtonText}>סריקה חדשה</Text></Pressable>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 16 },
  header: { gap: 8 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "#F5B72C", fontSize: 15, fontWeight: "800" },
  eyebrow: { color: "#F5B72C", fontSize: 14, fontWeight: "800", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 32, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB6C8", fontSize: 15, lineHeight: 22, textAlign: "right" },
  cameraWrap: { height: 300, borderRadius: 24, overflow: "hidden", backgroundColor: "#101A2E", borderWidth: 1, borderColor: "#314361", position: "relative" },
  camera: { flex: 1 },
  scanFrame: { position: "absolute", left: "18%", right: "18%", top: "24%", bottom: "24%" },
  cornerTopRight: { position: "absolute", right: 0, top: 0, width: 32, height: 32, borderTopWidth: 4, borderRightWidth: 4, borderColor: "#F5B72C" },
  cornerTopLeft: { position: "absolute", left: 0, top: 0, width: 32, height: 32, borderTopWidth: 4, borderLeftWidth: 4, borderColor: "#F5B72C" },
  cornerBottomRight: { position: "absolute", right: 0, bottom: 0, width: 32, height: 32, borderBottomWidth: 4, borderRightWidth: 4, borderColor: "#F5B72C" },
  cornerBottomLeft: { position: "absolute", left: 0, bottom: 0, width: 32, height: 32, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: "#F5B72C" },
  cameraHint: { position: "absolute", bottom: 10, left: 0, right: 0, color: "#F7F9FC", fontSize: 13, textAlign: "center", fontWeight: "700" },
  permissionBox: { gap: 12, padding: 18, backgroundColor: "#162238", borderRadius: 20, borderWidth: 1, borderColor: "#314361" },
  permissionTitle: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", textAlign: "right" },
  permissionText: { color: "#AAB6C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  primary: { alignItems: "center", backgroundColor: "#F5B72C", borderRadius: 14, paddingVertical: 14 },
  primaryText: { color: "#101827", fontSize: 16, fontWeight: "900" },
  manualBox: { gap: 10, padding: 16, backgroundColor: "#121D31", borderRadius: 20, borderWidth: 1, borderColor: "#293B59" },
  manualTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  input: { color: "#F7F9FC", backgroundColor: "#0B1224", borderColor: "#3A5278", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  secondary: { alignItems: "center", borderRadius: 14, borderWidth: 1, borderColor: "#F5B72C", paddingVertical: 12 },
  secondaryText: { color: "#F5B72C", fontSize: 15, fontWeight: "900" },
  statusBox: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, padding: 14 },
  statusText: { color: "#F5B72C", fontSize: 14, fontWeight: "800" },
  resultBox: { padding: 16, backgroundColor: "#183021", borderRadius: 16, borderWidth: 1, borderColor: "#4D9D68" },
  resultText: { color: "#E8FFF0", fontSize: 15, lineHeight: 23, textAlign: "right" },
  saveButton: { alignItems: "center", marginTop: 12, borderRadius: 12, backgroundColor: "#F5B72C", paddingVertical: 12 },
  saveButtonText: { color: "#101827", fontSize: 14, fontWeight: "900" },
  fallbackBox: { gap: 8, padding: 16, backgroundColor: "#162238", borderRadius: 20, borderWidth: 1, borderColor: "#314361" },
  fallbackTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  fallbackText: { color: "#AAB6C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  fallbackActions: { flexDirection: "row-reverse", gap: 10 },
  fallbackButton: { flex: 1, alignItems: "center", borderRadius: 12, backgroundColor: "#243A61", paddingVertical: 12 },
  fallbackButtonText: { color: "#F7F9FC", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
