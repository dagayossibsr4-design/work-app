import AsyncStorage from "@react-native-async-storage/async-storage";
import { createElement, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodGroup, FoodItem, FoodSubgroup } from "@/lib/food-nutrition";

const numeric = (value: string) => value.replace(/[^0-9.,]/g, "").replace(",", ".");
type ScanPhase = "idle" | "choosing" | "uploading" | "extracting" | "success" | "error";

const foodGroups: FoodGroup[] = ["חלבון", "פחמימה", "שומן", "ירק ופרי", "שונות", "מוצרים שנסרקו"];
const foodSubgroups: FoodSubgroup[] = [
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
];

const errorCopy = (error: unknown) => {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("timeout") || raw.includes("502") || raw.includes("503")) return "לא הצלחנו להתחבר לשירות החילוץ. בדוק את החיבור לאינטרנט ונסה שוב.";
  if (raw.includes("413") || raw.includes("size") || raw.includes("payload") || raw.includes("image") || raw.includes("base64") || raw.includes("format")) return "התמונה גדולה מדי או לא נקראה כראוי. נסה לצלם את טבלת הערכים מקרוב.";
  if (raw.includes("429") || raw.includes("limit")) return "השירות עמוס כרגע. המתן כמה שניות ונסה שוב.";
  return "לא הצלחנו לחלץ את הערכים מהתווית. ודא שטבלת הערכים גלויה וברורה ונסה שוב.";
};

const FOOD_LABEL_DRAFT_KEY = "food-label-draft-v3";
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

// כיווץ תמונה בטוח מבוסס Canvas בדפדפן - ללא שום צורך בספריות צד שלישי שקורסות
const compressImageInBrowser = async (file: File | Blob): Promise<{ base64: string; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const maxWidth = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ base64: normalizeBase64(String(e.target?.result ?? "")), previewUrl: img.src });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve({
          base64: normalizeBase64(dataUrl),
          previewUrl: dataUrl,
        });
      };
      img.onerror = () => reject(new Error("שגיאה בטעינת קובץ התמונה"));
      img.src = String(e.target?.result ?? "");
    };
    reader.onerror = () => reject(new Error("שגיאה בקריאת הקובץ"));
    reader.readAsDataURL(file);
  });
};

export default function FoodLabelScreen() {
  const { updateNutritionProfile } = useWorkoutStore();
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
  const [subgroupPickerOpen, setSubgroupPickerOpen] = useState(false);
  
  const webCameraInputRef = useRef<HTMLInputElement | null>(null);
  const webGalleryInputRef = useRef<HTMLInputElement | null>(null);

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
        } catch {}
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
  const phaseLabel = phase === "choosing" ? "פותח את בחירת התמונות" : phase === "uploading" ? "מכין את התמונה לחילוץ" : phase === "extracting" ? "מנתח את טבלת הערכים בענן..." : "";
  const selectedSubgroupLabel = subgroup === "ללא" ? "לא נבחרה תת־קטגוריה" : subgroup;

  const extractFromBase64 = async (base64: string, uri: string) => {
    setErrorMessage("");
    setMessage("");
    setPhase("uploading");
    await new Promise((resolve) => setTimeout(resolve, 150));
    setPhase("extracting");

    try {
      const extracted = await extract.mutateAsync({
        imageDataUrl: `data:image/jpeg;base64,${base64}`,
      });

      setImageUri(uri);
      setName(extracted.name || "");
      setBrand(extracted.brand || "");
      setCalories(extracted.calories ? String(Math.round(extracted.calories * 10) / 10) : "");
      setProtein(extracted.protein ? String(Math.round(extracted.protein * 10) / 10) : "");
      setCarbohydrates(extracted.carbohydrates ? String(Math.round(extracted.carbohydrates * 10) / 10) : "");
      setFats(extracted.fats ? String(Math.round(extracted.fats * 10) / 10) : "");
      setConfidence(extracted.confidence);
      setNote(extracted.note || "");
      setMessage("החילוץ הושלם. בדוק את הערכים לפני שמירה.");
      setPhase("success");
    } catch (err) {
      setPhase("error");
      setErrorMessage(errorCopy(err));
    }
  };

  const handleWebFile = async (file: File) => {
    setErrorMessage("");
    setPhase("uploading");
    try {
      const { base64, previewUrl } = await compressImageInBrowser(file);
      setLastBase64(base64);
      await extractFromBase64(base64, previewUrl);
    } catch (err) {
      setPhase("error");
      setErrorMessage(errorCopy(err));
    }
  };

  const openNativeOrWebCamera = async () => {
    if (isBusy) return;
    if (Platform.OS === "web") {
      webCameraInputRef.current?.click();
      return;
    }
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      if (!res.canceled && res.assets[0]?.base64) {
        setLastBase64(res.assets[0].base64);
        await extractFromBase64(normalizeBase64(res.assets[0].base64), res.assets[0].uri);
      }
    } catch (err) {
      setPhase("error");
      setErrorMessage(errorCopy(err));
    }
  };

  const openNativeOrWebGallery = async () => {
    if (isBusy) return;
    if (Platform.OS === "web") {
      webGalleryInputRef.current?.click();
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
      if (!res.canceled && res.assets[0]?.base64) {
        setLastBase64(res.assets[0].base64);
        await extractFromBase64(normalizeBase64(res.assets[0].base64), res.assets[0].uri);
      }
    } catch (err) {
      setPhase("error");
      setErrorMessage(errorCopy(err));
    }
  };

  const saveFood = () => {
    if (!name.trim() || !calories.trim()) {
      setErrorMessage("כדי לשמור, יש להזין לפחות שם מוצר וקלוריות ל־100 גרם.");
      return;
    }
    const item: FoodItem = {
      id: `ai-food-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      group,
      subgroup: subgroup === "ללא" ? undefined : subgroup,
      fatLevel: Number(fats) <= 5 ? "דל שומן" : Number(fats) <= 15 ? "בינוני" : "שומני",
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
    setMessage(`המוצר נשמר במאגר האישי תחת ${group}${subgroup !== "ללא" ? ` · ${subgroup}` : ""}.`);
    setPhase("success");
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>כלי חכם לתזונה</Text>
          <Text style={styles.title}>חילוץ תווית מזון</Text>
          <Text style={styles.subtitle}>צילום או העלאה של טבלת ערכים, אימות קצר ושמירה ישירה למאגר האישי.</Text>
        </View>

        <View style={[styles.card, styles.captureCard]}>
          <SectionHeader number="01" title="העלאת התווית" subtitle="צלם טבלה ברורה ומוארת, או בחר תמונה קיימת" />
          <View style={styles.captureActions}>
            <Pressable disabled={isBusy} onPress={openNativeOrWebCamera} style={({ pressed }) => [styles.cameraButton, isBusy && styles.disabled, pressed && !isBusy && styles.pressed]}>
              <Text style={styles.cameraIcon}>⌁</Text>
              <Text style={styles.cameraText}>צלם תווית</Text>
              <Text style={styles.buttonHint}>מהמצלמה</Text>
            </Pressable>
            <Pressable disabled={isBusy} onPress={openNativeOrWebGallery} style={({ pressed }) => [styles.primary, isBusy && styles.disabled, pressed && !isBusy && styles.pressed]}>
              <Text style={styles.primaryIcon}>＋</Text>
              <Text style={styles.primaryText}>{isBusy ? "מעבד…" : "בחר תמונה"}</Text>
              <Text style={styles.primaryHint}>{isBusy ? "המתן לסיום" : "מהגלריה או קובץ"}</Text>
            </Pressable>
          </View>

          {/* Web inputs חבויים שמבטיחים פתיחה ישירה בדפדפן בלי שום קריסה */}
          {Platform.OS === "web" ? (
            <>
              {createElement("input", {
                ref: (n: HTMLInputElement | null) => { webCameraInputRef.current = n; },
                type: "file",
                accept: "image/*",
                capture: "environment",
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) void handleWebFile(f);
                  e.target.value = "";
                },
                style: { display: "none" },
              })}
              {createElement("input", {
                ref: (n: HTMLInputElement | null) => { webGalleryInputRef.current = n; },
                type: "file",
                accept: "image/*",
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) void handleWebFile(f);
                  e.target.value = "";
                },
                style: { display: "none" },
              })}
            </>
          ) : null}

          <Text style={styles.captureFootnote}>להצלחה מרבית: מלא את רוב המסך בטבלת הערכים, ללא סנוור וללא טשטוש.</Text>
        </View>

        {isBusy ? <StatusPanel tone="loading" title={phaseLabel} copy="התמונה מעובדת. השאר את המסך פתוח עד לסיום החילוץ." /> : null}
        {phase === "error" ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>החילוץ לא הושלם</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        {phase === "success" && !isBusy ? <StatusPanel tone="success" title="התמונה נותחה" copy="בדוק את הערכים למטה מול האריזה לפני שמירה למאגר." /> : null}
        {imageUri ? (
          <View style={styles.previewSection}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          </View>
        ) : null}

        <View style={styles.card}>
          <SectionHeader number="02" title="פרטי המוצר" subtitle="אמת את הזיהוי לפני שמירה" />
          <View style={styles.fieldStack}>
            <Field label="שם המוצר" value={name} onChangeText={setName} placeholder="לדוגמה: קוטג׳ 5%" />
            <Field label="מותג או מקור" value={brand} onChangeText={setBrand} placeholder="לדוגמה: תנובה" />
          </View>
        </View>

        <View style={styles.card}>
          <SectionHeader number="03" title="ערכים תזונתיים" subtitle="כל הערכים מחושבים ל־100 גרם" />
          <View style={styles.nutritionGrid}>
            <Field label="קלוריות" value={calories} onChangeText={(v) => setCalories(numeric(v))} keyboardType="decimal-pad" suffix="קק״ל" />
            <Field label="חלבון" value={protein} onChangeText={(v) => setProtein(numeric(v))} keyboardType="decimal-pad" suffix="גרם" />
            <Field label="פחמימות" value={carbohydrates} onChangeText={(v) => setCarbohydrates(numeric(v))} keyboardType="decimal-pad" suffix="גרם" />
            <Field label="שומן" value={fats} onChangeText={(v) => setFats(numeric(v))} keyboardType="decimal-pad" suffix="גרם" />
          </View>
          {confidence !== null ? (
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>רמת ביטחון בחילוץ</Text>
              <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
            </View>
          ) : null}
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>

        <View style={styles.card}>
          <SectionHeader number="04" title="שיוך למאגר" subtitle="בחר קטגוריה כדי למצוא את המוצר במהירות" />
          <Text style={styles.inputLabel}>קטגוריה ראשית</Text>
          <View style={styles.categoryGrid}>
            {foodGroups.map((item) => {
              const selected = group === item;
              return (
                <Pressable key={item} onPress={() => { setGroup(item); setSubgroup("ללא"); }} style={[styles.categoryButton, selected && styles.categoryButtonActive]}>
                  <Text style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}>{selected ? "✓ " : ""}{item}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.inputLabel}>תת־קטגוריה <Text style={styles.optional}>אופציונלי</Text></Text>
          <Pressable onPress={() => setSubgroupPickerOpen((v) => !v)} style={styles.subgroupTrigger}>
            <View style={styles.subgroupTriggerText}>
              <Text style={styles.subgroupValue}>{selectedSubgroupLabel}</Text>
            </View>
            <Text style={styles.subgroupChevron}>{subgroupPickerOpen ? "⌃" : "⌄"}</Text>
          </Pressable>
          {subgroupPickerOpen ? (
            <View style={styles.subgroupPanel}>
              <Pressable onPress={() => { setSubgroup("ללא"); setSubgroupPickerOpen(false); }} style={[styles.subgroupOption, subgroup === "ללא" && styles.subgroupOptionActive]}>
                <Text style={[styles.subgroupOptionText, subgroup === "ללא" && styles.subgroupOptionTextActive]}>ללא תת־קטגוריה</Text>
              </Pressable>
              {foodSubgroups.map((item) => (
                <Pressable key={item} onPress={() => { setSubgroup(item); setSubgroupPickerOpen(false); }} style={[styles.subgroupOption, subgroup === item && styles.subgroupOptionActive]}>
                  <Text style={[styles.subgroupOptionText, subgroup === item && styles.subgroupOptionTextActive]}>{subgroup === item ? "✓ " : ""}{item}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.savePanel}>
          <Text style={styles.savePanelTitle}>מוכן לשמירה?</Text>
          <Text style={styles.savePanelCopy}>הפריט יישמר במאגר האישי ויהיה זמין בתפריט הארוחות.</Text>
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

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.sectionNumber}>{number}</Text>
    </View>
  );
}

function StatusPanel({ tone, title, copy }: { tone: "loading" | "success"; title: string; copy: string }) {
  const loading = tone === "loading";
  return (
    <View style={[styles.statusPanel, loading ? styles.loadingPanel : styles.successPanel]}>
      {loading ? <ActivityIndicator color="#F5B72C" size="small" /> : <Text style={styles.successTick}>✓</Text>}
      <View style={styles.statusCopy}>
        <Text style={[styles.statusTitle, loading ? styles.loadingTitle : styles.successTitle]}>{title}</Text>
        <Text style={styles.statusText}>{copy}</Text>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default", placeholder = "—", suffix }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: KeyboardTypeOptions; placeholder?: string; suffix?: string }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.label}>{label}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" keyboardType={keyboardType} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 42 },
  header: { gap: 6, alignItems: "flex-end", paddingTop: 4, paddingBottom: 6 },
  eyebrow: { color: "#F5B72C", fontSize: 12, fontWeight: "900", letterSpacing: 0.4 },
  title: { color: "#F7F9FC", fontSize: 31, lineHeight: 38, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 13, lineHeight: 20, textAlign: "right", maxWidth: 340 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 20, padding: 16, gap: 14 },
  captureCard: { borderColor: "#455E86" },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  sectionCopy: { flex: 1, gap: 3, alignItems: "flex-end" },
  sectionNumber: { color: "#F5B72C", fontSize: 12, fontWeight: "900", borderColor: "#7C6030", borderWidth: 1, borderRadius: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 },
  sectionTitle: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", textAlign: "right" },
  sectionSubtitle: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right" },
  captureActions: { flexDirection: "row-reverse", gap: 10 },
  primary: { flex: 1, backgroundColor: "#F5B72C", borderRadius: 14, minHeight: 90, alignItems: "center", justifyContent: "center", gap: 3 },
  primaryIcon: { color: "#0B1224", fontSize: 25, fontWeight: "900", lineHeight: 28 },
  primaryText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  primaryHint: { color: "#40310F", fontSize: 10, fontWeight: "700" },
  cameraButton: { flex: 1, borderColor: "#65BDF6", borderWidth: 1, borderRadius: 14, minHeight: 90, alignItems: "center", justifyContent: "center", backgroundColor: "#1B3458", gap: 3 },
  cameraIcon: { color: "#8ED8FF", fontSize: 27, fontWeight: "900", lineHeight: 28 },
  cameraText: { color: "#D9EEFF", fontSize: 15, fontWeight: "900" },
  buttonHint: { color: "#9EC4E0", fontSize: 10, fontWeight: "700" },
  captureFootnote: { color: "#9FB4CC", fontSize: 10, lineHeight: 16, textAlign: "right" },
  disabled: { opacity: 0.58 },
  statusPanel: { flexDirection: "row-reverse", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 15, padding: 13 },
  loadingPanel: { backgroundColor: "#243B61", borderColor: "#5D8DC1" },
  successPanel: { backgroundColor: "#163B35", borderColor: "#42D392" },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { fontWeight: "900", textAlign: "right" },
  loadingTitle: { color: "#F5B72C" },
  successTitle: { color: "#65E5AA" },
  statusText: { color: "#D9E2EF", fontSize: 11, lineHeight: 16, textAlign: "right" },
  successTick: { color: "#0B1224", backgroundColor: "#42D392", borderRadius: 14, overflow: "hidden", width: 28, height: 28, textAlign: "center", lineHeight: 28, fontWeight: "900" },
  errorBox: { backgroundColor: "#3A1E2B", borderColor: "#F16B7A", borderWidth: 1, borderRadius: 15, padding: 14, gap: 8 },
  errorTitle: { color: "#FF9AAA", fontWeight: "900", fontSize: 15, textAlign: "right" },
  errorText: { color: "#FFE2E6", fontSize: 11, lineHeight: 17, textAlign: "right" },
  previewSection: { backgroundColor: "#101B2F", borderColor: "#324763", borderWidth: 1, borderRadius: 17, padding: 11 },
  preview: { width: "100%", height: 200, borderRadius: 10, backgroundColor: "#0B1224" },
  fieldStack: { gap: 12 },
  nutritionGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  field: { width: "100%", gap: 5 },
  fieldLabelRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#D9E2EF", fontSize: 11, fontWeight: "800", textAlign: "right" },
  suffix: { color: "#7E8DA4", fontSize: 10, fontWeight: "700" },
  input: { color: "#F7F9FC", backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 11, minHeight: 48, paddingHorizontal: 12, fontSize: 15 },
  confidenceRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#193E3A", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  confidenceLabel: { color: "#C8F6DF", fontSize: 11, fontWeight: "800" },
  confidenceValue: { color: "#65E5AA", fontSize: 17, fontWeight: "900" },
  note: { color: "#F5CF75", fontSize: 11, lineHeight: 17, textAlign: "right" },
  inputLabel: { color: "#D9E2EF", fontSize: 11, fontWeight: "900", textAlign: "right", marginTop: 1 },
  optional: { color: "#7E8DA4", fontWeight: "700" },
  categoryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  categoryButton: { width: "48%", minHeight: 45, borderColor: "#3D587C", borderWidth: 1, borderRadius: 11, justifyContent: "center", alignItems: "center", backgroundColor: "#101B2F", paddingHorizontal: 7 },
  categoryButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  categoryButtonText: { color: "#D9E2EF", fontSize: 11, fontWeight: "800", textAlign: "center" },
  categoryButtonTextActive: { color: "#0B1224" },
  subgroupTrigger: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderColor: "#3D587C", borderWidth: 1, borderRadius: 11, backgroundColor: "#101B2F", minHeight: 52, paddingHorizontal: 12 },
  subgroupTriggerText: { alignItems: "flex-end", gap: 1, flex: 1 },
  subgroupValue: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  subgroupChevron: { color: "#F5B72C", fontSize: 22, marginLeft: 8, lineHeight: 25 },
  subgroupPanel: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, backgroundColor: "#101B2F", borderColor: "#324763", borderWidth: 1, borderRadius: 12, padding: 9 },
  subgroupOption: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 10, maxWidth: "100%" },
  subgroupOptionActive: { backgroundColor: "#2560A4", borderColor: "#8ED8FF" },
  subgroupOptionText: { color: "#D9E2EF", fontSize: 10, fontWeight: "800", textAlign: "right" },
  subgroupOptionTextActive: { color: "#F7F9FC" },
  savePanel: { backgroundColor: "#132E2C", borderColor: "#2C8B70", borderWidth: 1, borderRadius: 20, padding: 16, gap: 8, alignItems: "flex-end" },
  savePanelTitle: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", textAlign: "right" },
  savePanelCopy: { color: "#BAE5D4", fontSize: 11, lineHeight: 17, textAlign: "right" },
  save: { backgroundColor: "#42D392", borderRadius: 12, minHeight: 52, alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginTop: 5 },
  saveText: { color: "#0B1224", fontSize: 16, fontWeight: "900" },
  message: { color: "#D9EEFF", fontSize: 11, lineHeight: 17, textAlign: "right", alignSelf: "stretch" },
  inlineError: { color: "#FFB3BE", fontSize: 11, lineHeight: 17, textAlign: "right", alignSelf: "stretch" },
  back: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#101B2F" },
  backText: { color: "#B9C7DA", fontWeight: "800" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});