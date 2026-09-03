import { createElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore } from "@/lib/workout-store";
import type { FoodItem } from "@/lib/food-nutrition";
import { trpc } from "@/lib/trpc";

const barcodeTypes = ["ean13", "ean8", "upc_a", "code128"] as const;

type WebBarcodeCaptureProps = {
  disabled: boolean;
  onDetected: (data: string) => void;
  onError: (message: string) => void;
};

type WebScannerInstance = {
  start: (
    cameraConfig: { facingMode: string },
    scanConfig: {
      fps: number;
      qrbox: number | { width: number; height: number } | ((viewfinderWidth: number, viewfinderHeight: number) => { width: number; height: number });
      aspectRatio?: number;
      disableFlip?: boolean;
      videoConstraints?: MediaTrackConstraints;
    },
    onSuccess: (decodedText: string) => void,
    onError?: (errorMessage: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
};

function WebBarcodeCapture({ disabled, onDetected, onError }: WebBarcodeCaptureProps) {
  const scannerIdRef = useRef(`prolifto-web-scanner-${Math.random().toString(36).slice(2)}`);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<WebScannerInstance | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onDetectedRef.current = onDetected;
    onErrorRef.current = onError;
  }, [onDetected, onError]);

  useEffect(() => {
    if (disabled || typeof window === "undefined" || typeof document === "undefined") return;

    let cancelled = false;
    detectedRef.current = false;

    const acceptValue = (rawValue: string | undefined) => {
      if (cancelled || detectedRef.current || !rawValue) return;
      const rawText = rawValue.trim();
      const value = rawText.replace(/[-\s]/g, "");
      if (!/^[0-9]{6,32}$/.test(value)) {
        onErrorRef.current("זוהה קוד QR או טקסט. יש לכוון לברקוד המוצר עם הפסים והמספרים שמתחתיו.");
        return;
      }
      detectedRef.current = true;
      onDetectedRef.current(value);
    };

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(scannerIdRef.current, {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
        }) as unknown as WebScannerInstance;
        scannerRef.current = scanner;
        if (!navigator.mediaDevices?.getUserMedia) {
          onErrorRef.current("הדפדפן אינו מאפשר מצלמה. אפשר לבחור תמונה של ברקוד או להזין את המספר ידנית.");
          return;
        }
        try {
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => ({
                width: Math.min(Math.floor(viewfinderWidth * 0.86), 520),
                height: Math.min(Math.floor(viewfinderHeight * 0.34), 180),
              }),
              aspectRatio: 1.777778,
              disableFlip: true,
              videoConstraints: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            },
            (decodedText) => acceptValue(decodedText),
            () => undefined,
          );
          if (cancelled) {
            await scanner.stop().catch(() => undefined);
            scanner.clear();
          }
        } catch {
          if (!cancelled) {
            onErrorRef.current("לא ניתן להפעיל את מצלמת הסריקה. אפשר לבחור תמונה של ברקוד או להזין את המספר ידנית.");
          }
        }
      } catch {
        if (!cancelled) {
          onErrorRef.current("לא ניתן לטעון את מנגנון הסריקה. אפשר להזין את המספר ידנית.");
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => undefined).finally(() => {
          try {
            scanner.clear();
          } catch {
            // The scanner may already be cleared during an interrupted start.
          }
        });
      }
    };
  }, [disabled]);

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled) return;
    let scanner = scannerRef.current;
    try {
      if (!scanner) {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        scanner = new Html5Qrcode(scannerIdRef.current, {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
        }) as unknown as WebScannerInstance;
        scannerRef.current = scanner;
      }
      const result = await scanner.scanFile(file, true);
      const value = result.replace(/[-\s]/g, "");
      if (/^[0-9]{6,32}$/.test(value)) onDetectedRef.current(value);
      else onErrorRef.current("התמונה מכילה QR או טקסט, אך לא ברקוד מוצר מספרי.");
    } catch {
      onErrorRef.current("לא נמצא ברקוד בתמונה. נסה צילום חד יותר או הזן את המספר ידנית.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <View style={styles.webScannerSection}>
      <View style={styles.cameraVideoHost}>
        {createElement("div", {
          id: scannerIdRef.current,
          "aria-label": "תצוגת מצלמה לסריקת ברקוד",
          style: styles.webScannerHost,
        })}
        <View pointerEvents="none" style={styles.scanFrame}>
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerBottomRight} />
          <View style={styles.cornerBottomLeft} />
        </View>
        <Text style={styles.cameraHint}>{disabled ? "הברקוד נקלט" : "כוון את הברקוד לתוך המסגרת"}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => inputRef.current?.click()}
        style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}
      >
        <Text style={styles.imageButtonText}>סרוק ברקוד מתמונה</Text>
      </Pressable>
      {createElement("input", {
        ref: inputRef,
        type: "file",
        accept: "image/*",
        capture: "environment",
        onChange: handleImageSelected,
        style: styles.hiddenFileInput,
      })}
    </View>
  );
}

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
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbohydrates, setManualCarbohydrates] = useState("");
  const [manualFats, setManualFats] = useState("");
  const [manualServingGrams, setManualServingGrams] = useState("100");
  const { updateNutritionProfile } = useWorkoutStore();
  const goBackToNutrition = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/nutrition" as never);
    }
  };
  const lookup = trpc.barcodeLookup.useMutation({
    onSuccess: (result) => {
      if (!result.found) {
        setFoundProduct(null);
        setManualOpen(true);
        setMessage("המוצר לא נמצא במאגר. אפשר להשלים את פרטי המוצר ידנית ולשמור אותו.");
        return;
      }
      setManualOpen(false);
      setFoundProduct({
        barcode: result.barcode,
        name: result.name || "מוצר ללא שם",
        brand: result.brand || "",
        servingSize: result.servingSize || "",
        calories: result.calories,
        protein: result.protein,
        carbohydrates: result.carbohydrates,
        fats: result.fats,
      });
      const macroMessage =
        result.calories !== null ||
        result.protein !== null ||
        result.carbohydrates !== null ||
        result.fats !== null
          ? `קלוריות: ${result.calories ?? "—"} · חלבון: ${result.protein ?? "—"} ג׳ · פחמימות: ${result.carbohydrates ?? "—"} ג׳ · שומן: ${result.fats ?? "—"} ג׳ ל־100 ג׳`
          : "נמצא מוצר, אך חסרים בו ערכי תזונה מלאים.";
      setMessage(`${result.name || "מוצר ללא שם"}${result.brand ? ` · ${result.brand}` : ""}\n${macroMessage}`);
    },
    onError: () => {
      setManualOpen(true);
      setMessage("לא ניתן להשלים את החיפוש כרגע. אפשר להשלים את פרטי המוצר ידנית.");
    },
  });

  const handleBarcodeData = (data: string) => {
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

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    handleBarcodeData(data);
  };

  const saveProductToPersonalDatabase = (product: FoodItem) => {
    updateNutritionProfile((current) => {
      const foods = current.customFoods ?? [];
      const existingIndex = product.barcode ? foods.findIndex((item) => item.barcode === product.barcode) : -1;
      const nextFoods = existingIndex >= 0
        ? foods.map((item, index) => (index === existingIndex ? { ...item, ...product } : item))
        : [product, ...foods];
      return { ...current, customFoods: nextFoods, customFoodsUpdatedAt: Date.now() };
    });
    setMessage(`המוצר ${product.name} נשמר במאגר האישי ויופיע בחיפוש ובארוחות.`);
    setManualOpen(false);
  };

  const saveFoundProduct = () => {
    if (!foundProduct) return;
    const calories = foundProduct.calories ?? 0;
    const protein = foundProduct.protein ?? 0;
    const carbohydrates = foundProduct.carbohydrates ?? 0;
    const fats = foundProduct.fats ?? 0;
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
      fatLevel: fats <= 5 ? "דל שומן" : fats <= 15 ? "בינוני" : "שומני",
      sourceType: "אישי",
    };
    saveProductToPersonalDatabase(product);
  };

  const saveManualProduct = () => {
    const name = manualName.trim();
    const servingGrams = Number(manualServingGrams.replace(",", "."));
    const calories = Number(manualCalories.replace(",", "."));
    const protein = Number(manualProtein.replace(",", "."));
    const carbohydrates = Number(manualCarbohydrates.replace(",", "."));
    const fats = Number(manualFats.replace(",", "."));
    if (!name || !Number.isFinite(servingGrams) || servingGrams <= 0 || [calories, protein, carbohydrates, fats].some((value) => !Number.isFinite(value) || value < 0)) {
      setMessage("יש למלא שם מוצר וגודל מנה, ולוודא שכל ערכי התזונה הם מספרים חיוביים או אפס.");
      return;
    }
    const normalizedBarcode = barcode.replace(/[-\s]/g, "") || undefined;
    const product: FoodItem = {
      id: normalizedBarcode ? `barcode-${normalizedBarcode}` : `manual-food-${Date.now()}`,
      name,
      brand: manualBrand.trim() || undefined,
      barcode: normalizedBarcode,
      group: "שונות",
      subgroup: "שונות",
      reference: "הוזן ידנית · ערכים לפי גודל המנה שהוזן",
      servingGrams,
      calories,
      protein,
      carbohydrates,
      fats,
      fatLevel: fats <= 5 ? "דל שומן" : fats <= 15 ? "בינוני" : "שומני",
      sourceType: "אישי",
    };
    saveProductToPersonalDatabase(product);
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

  if (!permission) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color="#F5B72C" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={goBackToNutrition}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹ חזרה לתזונה</Text>
          </Pressable>
          <Text style={styles.eyebrow}>סריקה מהירה</Text>
          <Text style={styles.title}>סריקת ברקוד</Text>
          <Text style={styles.subtitle}>
            כוון את המצלמה לברקוד שעל מוצר ארוז. לאחר הזיהוי נחפש את המוצר ונציג את הערכים הזמינים.
          </Text>
        </View>

        {Platform.OS !== "web" && !permission.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionTitle}>נדרשת גישה למצלמה</Text>
            <Text style={styles.permissionText}>
              אשר גישה כדי לסרוק ברקודים דרך הדפדפן או דרך האפליקציה.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void requestPermission()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>אישור גישה למצלמה</Text>
            </Pressable>
          </View>
        ) : Platform.OS === "web" ? (
          <WebBarcodeCapture
            disabled={scanned || lookup.isPending}
            onDetected={handleBarcodeData}
            onError={setMessage}
          />
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View pointerEvents="none" style={styles.scanFrame}>
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerBottomRight} />
              <View style={styles.cornerBottomLeft} />
            </View>
            <Text style={styles.cameraHint}>{scanned ? "הברקוד נקלט" : "מקם את הברקוד בתוך המסגרת"}</Text>
          </View>
        )}

        <View style={styles.manualBox}>
          <Text style={styles.manualTitle}>או הזן ברקוד ידנית</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="למשל 7290012345678"
            placeholderTextColor="#7E8DA4"
            keyboardType="number-pad"
            style={styles.input}
            textAlign="right"
          />
          <Pressable
            accessibilityRole="button"
            onPress={searchTypedBarcode}
            disabled={lookup.isPending}
            style={({ pressed }) => [styles.secondary, lookup.isPending && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{lookup.isPending ? "מחפש…" : "חפש מוצר לפי ברקוד"}</Text>
          </Pressable>
        </View>

        {lookup.isPending ? (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#F5B72C" />
            <Text style={styles.statusText}>מחפש מוצר במאגר…</Text>
          </View>
        ) : null}
        {message ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{message}</Text>
            {foundProduct ? (
              <Pressable
                accessibilityRole="button"
                onPress={saveFoundProduct}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              >
                <Text style={styles.saveButtonText}>שמור במאגר האישי</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {manualOpen ? (
          <View style={styles.manualProductBox}>
            <Text style={styles.manualProductTitle}>הזנת מוצר ידנית</Text>
            <Text style={styles.manualProductHint}>הערכים הם לפי גודל המנה שהוזן. בדוק אותם מול האריזה לפני השמירה.</Text>
            <TextInput value={manualName} onChangeText={setManualName} placeholder="שם המוצר *" placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" />
            <TextInput value={manualBrand} onChangeText={setManualBrand} placeholder="מותג (לא חובה)" placeholderTextColor="#7E8DA4" style={styles.input} textAlign="right" />
            <View style={styles.manualTwoColumns}>
              <TextInput value={manualServingGrams} onChangeText={setManualServingGrams} placeholder="גודל מנה בגרם *" placeholderTextColor="#7E8DA4" keyboardType="decimal-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
              <TextInput value={barcode} onChangeText={setBarcode} placeholder="ברקוד (לא חובה)" placeholderTextColor="#7E8DA4" keyboardType="number-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
            </View>
            <View style={styles.manualTwoColumns}>
              <TextInput value={manualCalories} onChangeText={setManualCalories} placeholder="קלוריות *" placeholderTextColor="#7E8DA4" keyboardType="decimal-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
              <TextInput value={manualProtein} onChangeText={setManualProtein} placeholder="חלבון בגרם *" placeholderTextColor="#7E8DA4" keyboardType="decimal-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
            </View>
            <View style={styles.manualTwoColumns}>
              <TextInput value={manualCarbohydrates} onChangeText={setManualCarbohydrates} placeholder="פחמימות בגרם *" placeholderTextColor="#7E8DA4" keyboardType="decimal-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
              <TextInput value={manualFats} onChangeText={setManualFats} placeholder="שומן בגרם *" placeholderTextColor="#7E8DA4" keyboardType="decimal-pad" style={[styles.input, styles.manualHalfInput]} textAlign="right" />
            </View>
            <Pressable accessibilityRole="button" onPress={saveManualProduct} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
              <Text style={styles.saveButtonText}>שמור מוצר במאגר האישי</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.fallbackBox}>
          <Text style={styles.fallbackTitle}>לא נמצא מוצר?</Text>
          <Text style={styles.fallbackText}>אפשר להמשיך לצילום תווית הערכים או להזנה ידנית, בלי לאבד את הסריקה.</Text>
          <View style={styles.fallbackActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setManualOpen(true)}
              style={({ pressed }) => [styles.fallbackButton, pressed && styles.pressed]}
            >
              <Text style={styles.fallbackButtonText}>הזן מוצר ידנית</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/food-label" as never)}
              style={({ pressed }) => [styles.fallbackButton, pressed && styles.pressed]}
            >
              <Text style={styles.fallbackButtonText}>צילום תווית</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setScanned(false);
                setMessage("");
                setFoundProduct(null);
                setManualOpen(false);
              }}
              style={({ pressed }) => [styles.fallbackButton, pressed && styles.pressed]}
            >
              <Text style={styles.fallbackButtonText}>סריקה חדשה</Text>
            </Pressable>
          </View>
        </View>
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 80 },
  content: { gap: 16 },
  header: { gap: 8 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "#F5B72C", fontSize: 15, fontWeight: "800" },
  eyebrow: { color: "#F5B72C", fontSize: 14, fontWeight: "800", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 32, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB6C8", fontSize: 15, lineHeight: 22, textAlign: "right" },
  cameraWrap: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#101A2E",
    borderWidth: 1,
    borderColor: "#314361",
    position: "relative",
  },
  webScannerSection: { gap: 10 },
  cameraVideoHost: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#101A2E",
    borderWidth: 1,
    borderColor: "#314361",
    position: "relative",
  },
  webScannerHost: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    touchAction: "pan-y",
  },
  imageButton: { alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#65BDF6", backgroundColor: "#1D2D48", paddingVertical: 11 },
  imageButtonText: { color: "#65BDF6", fontSize: 14, fontWeight: "900" },
  hiddenFileInput: { display: "none" },
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
  manualProductBox: { gap: 10, padding: 16, backgroundColor: "#182A3F", borderRadius: 20, borderWidth: 1, borderColor: "#65BDF6" },
  manualProductTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "900", textAlign: "right" },
  manualProductHint: { color: "#AAB6C8", fontSize: 12, lineHeight: 18, textAlign: "right" },
  manualTwoColumns: { flexDirection: "row", gap: 10 },
  manualHalfInput: { flex: 1, minWidth: 0 },
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
