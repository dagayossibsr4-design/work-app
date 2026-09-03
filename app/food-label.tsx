import AsyncStorage from "@react-native-async-storage/async-storage";
import { createElement, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodGroup, FoodItem, FoodSubgroup } from "@/lib/food-nutrition";

const numeric = (value: string) => value.replace(/[^0-9.,]/g, "").replace(",", ".");
type ScanPhase = "idle" | "choosing" | "uploading" | "extracting" | "success" | "error";

const errorCopy = (error: unknown) => {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("timeout") || raw.includes("502") || raw.includes("503")) {
    return "לא הצלחנו להתחבר לשירות החילוץ. בדוק את החיבור לאינטרנט ונסה שוב.";
  }
  if (raw.includes("413") || raw.includes("size") || raw.includes("payload") || raw.includes("image") || raw.includes("base64") || raw.includes("format")) {
    return "התמונה גדולה מדי או לא נקראה כראוי. נסה לצלם את טבלת הערכים מקרוב, ללא חיתוך או השתקפות.";
  }
  if (raw.includes("429") || raw.includes("limit")) {
    return "השירות עמוס כרגע. המתן כמה שניות ונסה שוב.";
  }
  if (raw.includes("json") || raw.includes("empty") || raw.includes("content")) {
    return "השירות לא החזיר תוצאה קריאה. נסה שוב עם צילום חד ומואר יותר.";
  }
  return "לא הצלחנו לחלץ את הערכים מהתווית. ודא שטבלת הערכים גלויה וברורה ונסה שוב.";
};

const FOOD_LABEL_DRAFT_KEY = "food-label-draft-v2";
type FoodLabelDraft = {
  imageUri: string;
  name: string;
  brand: string;
  calories: string;
  protein: string;
  carbohydrates: string;
  fats: string;
  confidence: number | null;
  note: string;
  group: FoodGroup;
  subgroup: FoodSubgroup | "ללא";
};

const normalizeBase64 = (value: string) => value.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");

const readBlobAsBase64 = async (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(normalizeBase64(String(reader.result ?? "")));
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את קובץ התמונה"));
    reader.readAsDataURL(blob);
  });

const readUriAsBase64 = async (uri: string) => {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("לא ניתן לקרוא את קובץ התמונה בדפדפן");
    const blob = await response.blob();
    return readBlobAsBase64(blob);
  }
  return normalizeBase64(
    await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
  );
};

export default function FoodLabelScreen() {
  const { nutritionProfile, updateNutritionProfile } = useWorkoutStore();
  const extract = trpc.foodLabel.useMutation();
  const [imageUri, setImageUri] = useState("");
  const [lastBase64, setLastBase64] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [fats, setFats] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [group, setGroup] = useState<FoodGroup>("שונות");
  const [subgroup, setSubgroup] = useState<FoodSubgroup | "ללא">("ללא");
  const [errorMessage, setErrorMessage] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [draftReady, setDraftReady] = useState(false);
  const webCameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(FOOD_LABEL_DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw) as Partial<FoodLabelDraft>;
          if (typeof draft.imageUri === "string") setImageUri(draft.imageUri);
          if (typeof draft.name === "string") setName(draft.name);
          if (typeof draft.brand === "string") setBrand(draft.brand);
          if (typeof draft.calories === "string") setCalories(draft.calories);
          if (typeof draft.protein === "string") setProtein(draft.protein);
          if (typeof draft.carbohydrates === "string") setCarbohydrates(draft.carbohydrates);
          if (typeof draft.fats === "string") setFats(draft.fats);
          if (typeof draft.confidence === "number") setConfidence(draft.confidence);
          if (typeof draft.note === "string") setNote(draft.note);
          if (draft.group) setGroup(draft.group);
          if (draft.subgroup) setSubgroup(draft.subgroup);
          if (draft.name || draft.imageUri) setMessage("שוחזרו הנתונים מהפעם האחרונה. אפשר להמשיך מאותה נקודה.");
        } catch {
          // התעלמות מטיוטה שגויה
        }
      })
      .catch(() => undefined)
      .finally(() => setDraftReady(true));
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const draft: FoodLabelDraft = {
      imageUri: imageUri.startsWith("data:") ? "" : imageUri,
      name,
      brand,
      calories,
      protein,
      carbohydrates,
      fats,
      confidence,
      note,
      group,
      subgroup,
    };
    AsyncStorage.setItem(FOOD_LABEL_DRAFT_KEY, JSON.stringify(draft)).catch(() => undefined);
  }, [draftReady, imageUri, name, brand, calories, protein, carbohydrates, fats, confidence, note, group, subgroup]);

  const isBusy = phase === "choosing" || phase === "uploading" || phase === "extracting" || extract.isPending;
  const phaseLabel =
    phase === "choosing"
      ? "פותח את בחירת התמונות…"
      : phase === "uploading"
      ? "מכין את התמונה לחילוץ…"
      : phase === "extracting"
      ? "מנתח את טבלת הערכים…"
      : "";

  const extractFromBase64 = async (base64: string, uri: string) => {
    setErrorMessage("");
    setMessage("");
    setPhase("uploading");
    await new Promise((resolve) => setTimeout(resolve, 150));
    setPhase("extracting");

    const extracted = await extract.mutateAsync({
      imageDataUrl: `data:image/jpeg;base64,${base64}`,
    });

    // שימוש ישיר בערכי 100 גרם ללא הכפלות שגויות
    setImageUri(uri);
    setName(extracted.name || "");
    setBrand(extracted.brand || "");
    setCalories(extracted.calories ? String(Math.round(extracted.calories * 10) / 10) : "");
    setProtein(extracted.protein ? String(Math.round(extracted.protein * 10) / 10) : "");
    setCarbohydrates(extracted.carbohydrates ? String(Math.round(extracted.carbohydrates * 10) / 10) : "");
    setFats(extracted.fats ? String(Math.round(extracted.fats * 10) / 10) : "");
    setConfidence(extracted.confidence);
    setNote(extracted.note || "");
    setMessage("החילוץ הושלם בהצלחה. ודא את הנתונים לפני שמירה.");
    setPhase("success");
  };

  const processSelectedImage = async (asset: { uri: string; file?: Blob }) => {
    if (!asset || !asset.uri) throw new Error("לא נבחרה תמונה");
    setPhase("uploading");

    let base64 = "";
    let previewUri = asset.uri;

    try {
      if (Platform.OS === "web" && asset.file) {
        base64 = await readBlobAsBase64(asset.file);
      } else {
        // כיווץ תמונה מקומי ישיר מהקובץ למניעת חריגת Payload
        const prepared = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        base64 = prepared.base64 ? normalizeBase64(prepared.base64) : await readUriAsBase64(prepared.uri);
        previewUri = prepared.uri;
      }
    } catch {
      base64 = await readUriAsBase64(asset.uri);
    }

    if (!base64) throw new Error("לא ניתן לקרוא את קובץ התמונה");
    setLastBase64(base64);
    await extractFromBase64(base64, previewUri);
  };

  const handleWebCameraChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setErrorMessage("");
    setMessage("");
    setPhase("choosing");
    try {
      await processSelectedImage({ uri: URL.createObjectURL(file), file });
    } catch (error) {
      setPhase("error");
      setErrorMessage(errorCopy(error));
    }
  };

  const openLabelCamera = () => {
    if (Platform.OS === "web") {
      webCameraInputRef.current?.click();
      return;
    }
    void takeLabelPhoto();
  };

  const takeLabelPhoto = async () => {
    if (isBusy) return;
    setErrorMessage("");
    setMessage("");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("יש לאשר גישה למצלמה כדי לצלם תווית");
      setPhase("choosing");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) {
        setPhase("idle");
        setMessage("הצילום בוטל.");
        return;
      }
      await processSelectedImage(result.assets[0]);
    } catch (error) {
      setPhase("error");
      setErrorMessage(errorCopy(error));
    }
  };

  const chooseLabel = async () => {
    if (isBusy) return;
    setErrorMessage("");
    setMessage("");
    setPhase("choosing");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) {
        setPhase("idle");
        setMessage("בחירת התמונה בוטלה.");
        return;
      }
      await processSelectedImage(result.assets[0]);
    } catch (error) {
      setPhase("error");
      setErrorMessage(errorCopy(error));
    }
  };

  const retryExtraction = async () => {
    if (!lastBase64 || isBusy) return;
    try {
      await extractFromBase64(lastBase64, imageUri);
    } catch (error) {
      setPhase("error");
      setErrorMessage(errorCopy(error));
    }
  };

  const saveFood = () => {
    if (!name.trim() || !calories.trim()) {
      setErrorMessage("כדי לשמור, יש להזין לפחות שם מוצר וקלוריות ל־100 גרם.");
      return;
    }
    const nutritionValues = [calories, protein, carbohydrates, fats].map(Number);
    const fatLevel =
      nutritionValues[3] <= 5 ? ("דל שומן" as const) : nutritionValues[3] <= 15 ? ("בינוני" as const) : ("שומני" as const);
    
    const item: FoodItem = {
      id: `ai-food-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      group,
      subgroup: subgroup === "ללא" ? undefined : subgroup,
      fatLevel,
      reference: "חולץ מתווית · ערכים ל־100 גרם",
      servingGrams: 100,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbohydrates: Number(carbohydrates) || 0,
      fats: Number(fats) || 0,
      sourceType: "אישי",
    };

    updateNutritionProfile((current) => ({
      ...current,
      customFoods: [item, ...(current.customFoods ?? [])],
      customFoodsUpdatedAt: Date.now(),
    }));

    setErrorMessage("");
    setMessage(`המוצר נשמר בהצלחה במאגר האישי תחת ${group}${subgroup !== "ללא" ? ` · ${subgroup}` : ""}.`);
    setPhase("success");
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>כלי חכם לתזונה</Text>
          <Text style={styles.title}>חילוץ תווית מזון</Text>
          <Text style={styles.subtitle}>
            צלם או העלה תמונה של טבלת הערכים. המערכת תחלץ את הנתונים לפי 100 גרם.
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void chooseLabel()}
            style={({ pressed }) => [styles.primary, isBusy && styles.disabled, pressed && !isBusy && styles.pressed]}
          >
            <Text style={styles.primaryText}>{isBusy ? "מעבד את התווית…" : "בחר תמונה וחלץ ערכים"}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={openLabelCamera}
            style={({ pressed }) => [styles.cameraButton, isBusy && styles.disabled, pressed && !isBusy && styles.pressed]}
          >
            <Text style={styles.cameraText}>צלם תווית עכשיו</Text>
          </Pressable>

          {Platform.OS === "web" ? (
            createElement("input", {
              ref: (node: HTMLInputElement | null) => {
                webCameraInputRef.current = node;
              },
              type: "file",
              accept: "image/*",
              capture: "environment",
              onChange: handleWebCameraChange,
              style: { display: "none" },
            })
          ) : null}

          {isBusy ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#F5B72C" size="small" />
              <View style={styles.loadingText}>
                <Text style={styles.loadingTitle}>{phaseLabel}</Text>
                <Text style={styles.loadingHint}>אין לסגור את המסך עד לסיום התהליך</Text>
              </View>
            </View>
          ) : null}

          {phase === "error" ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>החילוץ לא הושלם</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <View style={styles.errorActions}>
                {lastBase64 ? (
                  <Pressable onPress={() => void retryExtraction()} style={styles.retryButton}>
                    <Text style={styles.retryText}>נסה שוב</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void chooseLabel()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>בחר תמונה אחרת</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {phase === "success" && !isBusy ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>התמונה נותחה בהצלחה</Text>
              <Text style={styles.successText}>הערכים מוצגים ל־100 גרם. בדוק אותם לפני שמירה.</Text>
            </View>
          ) : null}

          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>אימות ועריכה לפני שמירה</Text>
          <Field label="שם מוצר" value={name} onChangeText={setName} keyboardType="default" />
          <Field label="מותג" value={brand} onChangeText={setBrand} keyboardType="default" />

          <View style={styles.groupRow}>
            {(["חלבון", "פחמימה", "שומן", "ירק ופרי", "שונות"] as FoodGroup[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setGroup(item);
                  setSubgroup("ללא");
                }}
                style={[styles.groupChip, group === item && styles.groupChipActive]}
              >
                <Text style={[styles.groupText, group === item && styles.groupTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.grid}>
            <Field label="קלוריות ל־100 גרם" value={calories} onChangeText={(v) => setCalories(numeric(v))} keyboardType="decimal-pad" />
            <Field label="חלבון ל־100 גרם" value={protein} onChangeText={(v) => setProtein(numeric(v))} keyboardType="decimal-pad" />
            <Field label="פחמימות ל־100 גרם" value={carbohydrates} onChangeText={(v) => setCarbohydrates(numeric(v))} keyboardType="decimal-pad" />
            <Field label="שומן ל־100 גרם" value={fats} onChangeText={(v) => setFats(numeric(v))} keyboardType="decimal-pad" />
          </View>

          <Text style={styles.subgroupLabel}>תת־קטגוריה (לא חובה)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subgroupScroll}>
            <View style={styles.subgroupRow}>
              {(
                [
                  "עופות",
                  "בשר",
                  "דגים",
                  "גבינות ומוצרי חלב",
                  "ביצים",
                  "קטניות ותחליפים",
                  "משקאות חלבון",
                  "אבקות חלבון",
                  "חטיפי חלבון",
                  "חטיפי בריאות ודגנים",
                  "לחמים ומאפים",
                  "פסטות ודגנים",
                  "סלטים קנויים",
                  "ממרחים ורטבים",
                  "שמנים, אגוזים וזרעים",
                  "חטיפים ומוצרים מוכנים",
                  "פחמימות",
                  "פירות וירקות",
                  "שונות",
                ] as FoodSubgroup[]
              ).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSubgroup(subgroup === item ? "ללא" : item)}
                  style={[styles.subgroupChip, subgroup === item && styles.subgroupChipActive]}
                >
                  <Text style={[styles.subgroupText, subgroup === item && styles.subgroupTextActive]}>
                    {subgroup === item ? "✓ " : ""}
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {confidence !== null ? (
            <Text style={styles.confidence}>רמת ביטחון בחילוץ: {Math.round(confidence * 100)}%</Text>
          ) : null}
          {note ? <Text style={styles.note}>{note}</Text> : null}

          <Pressable onPress={saveFood} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
            <Text style={styles.saveText}>שמור במאגר האישי</Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
          {errorMessage && phase !== "error" ? <Text style={styles.inlineError}>{errorMessage}</Text> : null}
        </View>

        <Pressable onPress={() => router.replace("/(tabs)/nutrition" as never)} style={styles.back}>
          <Text style={styles.backText}>חזרה למסך התזונה</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder="—"
        placeholderTextColor="#7E8DA4"
        style={styles.input}
        textAlign="right"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  header: { gap: 6, alignItems: "flex-end" },
  eyebrow: { color: "#F5B72C", fontWeight: "900" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 18 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 },
  primary: { backgroundColor: "#F5B72C", borderRadius: 11, minHeight: 48, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0B1224", fontWeight: "900" },
  cameraButton: { borderColor: "#65BDF6", borderWidth: 1, borderRadius: 11, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#1D3558" },
  cameraText: { color: "#D9EEFF", fontWeight: "900" },
  disabled: { opacity: 0.58 },
  loadingBox: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#243B61", borderColor: "#5D8DC1", borderWidth: 1, borderRadius: 12, padding: 11 },
  loadingText: { flex: 1, gap: 2 },
  loadingTitle: { color: "#F5B72C", fontWeight: "900", textAlign: "right" },
  loadingHint: { color: "#D9E2EF", fontSize: 10, textAlign: "right" },
  errorBox: { backgroundColor: "#3A1E2B", borderColor: "#F16B7A", borderWidth: 1, borderRadius: 12, padding: 12, gap: 7 },
  errorTitle: { color: "#FF9AAA", fontWeight: "900", textAlign: "right" },
  errorText: { color: "#FFE2E6", fontSize: 11, lineHeight: 17, textAlign: "right" },
  errorActions: { flexDirection: "row-reverse", gap: 8 },
  retryButton: { backgroundColor: "#F5B72C", borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 },
  retryText: { color: "#0B1224", fontWeight: "900" },
  secondaryButton: { borderColor: "#FF9AAA", borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryText: { color: "#FFE2E6", fontWeight: "800" },
  successBox: { backgroundColor: "#163B35", borderColor: "#42D392", borderWidth: 1, borderRadius: 12, padding: 11, gap: 3 },
  successTitle: { color: "#65E5AA", fontWeight: "900", textAlign: "right" },
  successText: { color: "#D8FFEC", fontSize: 10, textAlign: "right" },
  preview: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#0B1224" },
  section: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  groupRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  groupChip: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10 },
  groupChipActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  groupText: { color: "#D9E2EF", fontSize: 10, fontWeight: "800" },
  groupTextActive: { color: "#07111F" },
  subgroupLabel: { color: "#D9E2EF", fontSize: 10, fontWeight: "800", textAlign: "right" },
  subgroupScroll: { width: "100%" },
  subgroupRow: { flexDirection: "row-reverse", gap: 6 },
  subgroupChip: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, paddingVertical: 7, paddingHorizontal: 9, backgroundColor: "#0B1224" },
  subgroupChipActive: { backgroundColor: "#65BDF6", borderColor: "#8ED8FF" },
  subgroupText: { color: "#D9E2EF", fontSize: 9, fontWeight: "800" },
  subgroupTextActive: { color: "#07111F" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  field: { flex: 1, minWidth: "46%", gap: 4 },
  label: { color: "#D9E2EF", fontSize: 10, fontWeight: "800", textAlign: "right" },
  input: { color: "#F7F9FC", backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, minHeight: 43, paddingHorizontal: 10 },
  confidence: { color: "#42D392", fontWeight: "900", textAlign: "right" },
  note: { color: "#F5B72C", fontSize: 11, lineHeight: 17, textAlign: "right" },
  save: { backgroundColor: "#42D392", borderRadius: 10, minHeight: 46, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#0B1224", fontWeight: "900" },
  message: { color: "#D9EEFF", fontSize: 11, lineHeight: 17, textAlign: "right" },
  inlineError: { color: "#FF9AAA", fontSize: 11, lineHeight: 17, textAlign: "right" },
  back: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  backText: { color: "#AAB7C8", fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});