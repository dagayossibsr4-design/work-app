import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodGroup, FoodItem } from "@/lib/food-nutrition";

const numeric = (value: string) => value.replace(/[^0-9.,]/g, "").replace(",", ".");
const FOOD_LABEL_DRAFT_KEY = "food-label-draft-v4";

export default function FoodLabelScreen() {
  const { updateNutritionProfile } = useWorkoutStore();
  const extract = trpc.foodLabel.useMutation();

  const [imageUri, setImageUri] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbohydrates, setCarbohydrates] = useState("");
  const [fats, setFats] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [group, setGroup] = useState<FoodGroup>("שונות");
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<any>(null);

  useEffect(() => {
    AsyncStorage.getItem(FOOD_LABEL_DRAFT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        if (draft.name) setName(draft.name);
        if (draft.brand) setBrand(draft.brand);
        if (draft.calories) setCalories(draft.calories);
        if (draft.protein) setProtein(draft.protein);
        if (draft.carbohydrates) setCarbohydrates(draft.carbohydrates);
        if (draft.fats) setFats(draft.fats);
        if (draft.group) setGroup(draft.group);
      } catch {}
    }).catch(() => undefined);
  }, []);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");
    setMessage("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fullDataUrl = String(event.target?.result || "");
        setImageUri(fullDataUrl);

        // שליחה ישירה לשרת ה-tRPC
        const res = await extract.mutateAsync({ imageDataUrl: fullDataUrl });

        setName(res.name || "");
        setBrand(res.brand || "");
        setCalories(res.calories ? String(Math.round(res.calories * 10) / 10) : "");
        setProtein(res.protein ? String(Math.round(res.protein * 10) / 10) : "");
        setCarbohydrates(res.carbohydrates ? String(Math.round(res.carbohydrates * 10) / 10) : "");
        setFats(res.fats ? String(Math.round(res.fats * 10) / 10) : "");
        setConfidence(res.confidence);
        setMessage("החילוץ הסתיים בהצלחה. ודא את הערכים לפני שמירה.");
      } catch (err: any) {
        setErrorMessage(err?.message || "חלה שגיאה בחילוץ הערכים מהתמונה");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePickClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const saveFood = () => {
    if (!name.trim() || !calories.trim()) {
      setErrorMessage("יש להזין לפחות שם מוצר וקלוריות ל־100 גרם.");
      return;
    }

    const item: FoodItem = {
      id: `food-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      group,
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

    setMessage(`המוצר נשמר בהצלחה תחת קטגוריית ${group}.`);
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>כלי חכם לתזונה</Text>
          <Text style={styles.title}>חילוץ תווית מזון</Text>
          <Text style={styles.subtitle}>בחר או צלם תמונה של טבלת הערכים כדי לחלץ את הנתונים ישירות למאגר.</Text>
        </View>

        {/* שדה קלט נסתר לדפדפן */}
        {Platform.OS === "web" ? (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        ) : null}

        <View style={styles.card}>
          <Pressable
            disabled={isProcessing}
            onPress={handlePickClick}
            style={({ pressed }) => [styles.primary, isProcessing && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{isProcessing ? "מעבד ומנתח תמונה..." : "צלם או בחר תמונה מגלריה"}</Text>
          </Pressable>

          {isProcessing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#F5B72C" size="small" />
              <Text style={styles.loadingText}>מפענח את טבלת הערכים בענן...</Text>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}

          {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>פרטי המוצר שחולצו (ל־100 גרם)</Text>

          <View style={styles.field}>
            <Text style={styles.label}>שם המוצר</Text>
            <TextInput value={name} onChangeText={setName} placeholder="לדוגמה: יוגורט פרו" placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>מותג</Text>
            <TextInput value={brand} onChangeText={setBrand} placeholder="לדוגמה: שטראוס" placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" />
          </View>

          <View style={styles.grid}>
            <View style={styles.fieldCol}>
              <Text style={styles.label}>קלוריות ל־100 גרם</Text>
              <TextInput value={calories} onChangeText={(v) => setCalories(numeric(v))} keyboardType="decimal-pad" style={styles.input} textAlign="right" />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.label}>חלבון (גרם)</Text>
              <TextInput value={protein} onChangeText={(v) => setProtein(numeric(v))} keyboardType="decimal-pad" style={styles.input} textAlign="right" />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.label}>פחמימות (גרם)</Text>
              <TextInput value={carbohydrates} onChangeText={(v) => setCarbohydrates(numeric(v))} keyboardType="decimal-pad" style={styles.input} textAlign="right" />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.label}>שומן (גרם)</Text>
              <TextInput value={fats} onChangeText={(v) => setFats(numeric(v))} keyboardType="decimal-pad" style={styles.input} textAlign="right" />
            </View>
          </View>

          {confidence !== null ? <Text style={styles.confidence}>רמת ביטחון: {Math.round(confidence * 100)}%</Text> : null}

          <Pressable onPress={saveFood} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
            <Text style={styles.saveText}>שמור מוצר במאגר האישי</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace("/(tabs)/nutrition" as never)} style={styles.back}>
          <Text style={styles.backText}>חזרה למסך התזונה</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  header: { gap: 6, alignItems: "flex-end" },
  eyebrow: { color: "#F5B72C", fontWeight: "900" },
  title: { color: "#F7F9FC", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#AAB7C8", textAlign: "right", fontSize: 13 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  primary: { backgroundColor: "#F5B72C", borderRadius: 11, minHeight: 48, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0B1224", fontWeight: "900", fontSize: 15 },
  disabled: { opacity: 0.5 },
  loadingBox: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#243B61", borderRadius: 10, padding: 10 },
  loadingText: { color: "#F5B72C", fontWeight: "800", fontSize: 13 },
  errorText: { color: "#FF879A", fontSize: 12, textAlign: "right" },
  successText: { color: "#34D399", fontSize: 12, textAlign: "right" },
  preview: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#0B1224" },
  section: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  field: { width: "100%", gap: 4 },
  fieldCol: { flex: 1, minWidth: "46%", gap: 4 },
  label: { color: "#D9E2EF", fontSize: 11, fontWeight: "800", textAlign: "right" },
  input: { color: "#F7F9FC", backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, minHeight: 44, paddingHorizontal: 10 },
  confidence: { color: "#42D392", fontWeight: "900", textAlign: "right", fontSize: 12 },
  save: { backgroundColor: "#42D392", borderRadius: 10, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveText: { color: "#0B1224", fontWeight: "900" },
  back: { borderColor: "#3D587C", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  backText: { color: "#AAB7C8", fontWeight: "800" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});