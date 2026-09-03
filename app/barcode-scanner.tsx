import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore } from "@/lib/workout-store";
import { trpc } from "@/lib/trpc";

export default function BarcodeScannerScreen() {
  const isWeb = Platform.OS === "web";
  const [nativePermission, requestNativePermission] = useCameraPermissions();
  const [webHasPermission, setWebHasPermission] = useState<boolean | null>(isWeb ? null : true);
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundProduct, setFoundProduct] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { updateNutritionProfile } = useWorkoutStore();

  // שליפת מוצר ישירה מ-Open Food Facts
  const fetchFromAPI = async (code: string) => {
    try {
      setLoading(true);
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        const calories = Math.round(Number(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? 0));
        const protein = Number(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
        const carbohydrates = Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
        const fats = Number(nutriments.fat_100g ?? nutriments.fat ?? 0);

        const prod = {
          barcode: code,
          name: p.product_name || p.product_name_he || "מוצר ללא שם",
          brand: p.brands || "",
          servingSize: p.serving_size || "100 ג׳",
          calories: calories || 0,
          protein: !isNaN(protein) ? protein : 0,
          carbohydrates: !isNaN(carbohydrates) ? carbohydrates : 0,
          fats: !isNaN(fats) ? fats : 0,
        };

        setFoundProduct(prod);
        setMessage(`${prod.name}${prod.brand ? ` · ${prod.brand}` : ""}\nקלוריות: ${prod.calories} · חלבון: ${prod.protein} ג׳ · פחמימות: ${prod.carbohydrates} ג׳ · שומן: ${prod.fats} ג׳`);
      } else {
        setMessage("המוצר לא נמצא במאגר. ניתן להזין ידנית.");
      }
    } catch {
      setMessage("שגיאה בחיבור לרשת. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const lookup = trpc.barcodeLookup.useMutation({
    onSuccess: (res) => {
      if (!res.found) {
        void fetchFromAPI(barcode);
        return;
      }
      setFoundProduct(res);
      setMessage(`${res.name || "מוצר ללא שם"}\nקלוריות: ${res.calories ?? "—"} · חלבון: ${res.protein ?? "—"} ג׳`);
    },
    onError: () => {
      void fetchFromAPI(barcode);
    },
  });

  const isPending = lookup.isPending || loading;

  const handleBarcode = (code: string) => {
    if (scanned || isPending) return;
    const clean = code.replace(/[-\s]/g, "");
    if (!/^[0-9]{6,32}$/.test(clean)) return;

    setScanned(true);
    setBarcode(clean);
    setMessage("מחפש מוצר…");
    lookup.mutate({ barcode: clean });
  };

  // מצלמה ב-Web
  useEffect(() => {
    if (!isWeb) return;
    let active = true;
    let detector: any = null;
    let frameId: number;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "code_128"],
        });
      } catch {}
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setWebHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const scan = async () => {
          if (!active) return;
          if (detector && videoRef.current && videoRef.current.readyState >= 2 && !scanned) {
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0]?.rawValue) {
                handleBarcode(codes[0].rawValue);
              }
            } catch {}
          }
          if (active && !scanned) frameId = requestAnimationFrame(scan);
        };
        frameId = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (active) setWebHasPermission(false);
      });

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isWeb, scanned]);

  const saveProduct = () => {
    if (!foundProduct) return;
    const fats = Number(foundProduct.fats ?? 0);
    const fatLevel = fats <= 5 ? "דל שומן" : fats <= 15 ? "בינוני" : "שומני";

    const item = {
      id: `barcode-${foundProduct.barcode}`,
      name: foundProduct.name,
      group: "מוצרים שסרקתי",
      subgroup: "מוצרים שסרקתי",
      reference: `Open Food Facts · ${foundProduct.servingSize || "100 ג׳"}`,
      servingGrams: 100,
      calories: Number(foundProduct.calories ?? 0),
      protein: Number(foundProduct.protein ?? 0),
      carbohydrates: Number(foundProduct.carbohydrates ?? 0),
      fats,
      brand: foundProduct.brand || undefined,
      barcode: foundProduct.barcode,
      fatLevel,
      sourceType: "אישי",
    } as any;

    updateNutritionProfile((curr) => {
      const list = curr.customFoods ?? [];
      const idx = list.findIndex((x) => x.barcode === item.barcode);
      const next = idx >= 0 ? list.map((x, i) => (i === idx ? { ...x, ...item } : x)) : [item, ...list];
      return { ...curr, customFoods: next, customFoodsUpdatedAt: Date.now() };
    });

    setMessage(`המוצר ${item.name} נשמר בהצלחה ב״מוצרים שסרקתי״!`);
  };

  const hasPerm = isWeb ? webHasPermission : nativePermission?.granted;

  return (
    <ScreenContainer className="px-0 pt-0">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹ חזרה לתזונה</Text>
          </Pressable>
          <Text style={styles.title}>סריקת ברקוד</Text>
          <Text style={styles.subtitle}>כוון את המצלמה לברקוד או הקלד מספר ידנית.</Text>
        </View>

        {hasPerm === false ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>נדרשת גישה למצלמה</Text>
            {!isWeb && (
              <Pressable onPress={() => void requestNativePermission()} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>אשר מצלמה</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.cameraBox}>
            {isWeb ? (
              // @ts-ignore
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "code128"] }}
                onBarcodeScanned={scanned ? undefined : ({ data }: BarcodeScanningResult) => handleBarcode(data)}
              />
            )}
            <View pointerEvents="none" style={styles.frame} />
            <Text style={styles.hint}>{scanned ? "נקלט בהצלחה" : "מקם את הברקוד במסגרת"}</Text>
          </View>
        )}

        <View style={styles.box}>
          <Text style={styles.boxTitle}>הזנה ידנית</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="הזן ברקוד (לדוגמה 7290012345678)"
            placeholderTextColor="#7E8DA4"
            keyboardType="number-pad"
            style={styles.input}
            textAlign="right"
          />
          <Pressable
            onPress={() => handleBarcode(barcode)}
            disabled={isPending}
            style={[styles.btnSecondary, isPending && { opacity: 0.5 }]}
          >
            <Text style={styles.btnSecondaryText}>{isPending ? "מחפש…" : "חפש מוצר"}</Text>
          </Pressable>
        </View>

        {isPending && (
          <View style={styles.centerRow}>
            <ActivityIndicator color="#F5B72C" />
            <Text style={styles.statusText}>מחפש מוצר במאגר…</Text>
          </View>
        )}

        {message ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{message}</Text>
            {foundProduct && (
              <Pressable onPress={saveProduct} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>שמור ב״מוצרים שסרקתי״</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <View style={styles.fallbackRow}>
          <Pressable onPress={() => router.push("/food-label" as never)} style={styles.btnSmall}>
            <Text style={styles.btnSmallText}>צילום תווית</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setScanned(false);
              setMessage("");
              setFoundProduct(null);
            }}
            style={styles.btnSmall}
          >
            <Text style={styles.btnSmallText}>סריקה חדשה</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 60, gap: 16 },
  header: { gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "#F5B72C", fontSize: 15, fontWeight: "bold" },
  title: { color: "#F7F9FC", fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB6C8", fontSize: 14, textAlign: "right" },
  cameraBox: { height: 260, borderRadius: 20, overflow: "hidden", backgroundColor: "#0B1224", borderWidth: 1, borderColor: "#314361", position: "relative" },
  frame: { position: "absolute", left: "15%", right: "15%", top: "25%", bottom: "25%", borderWidth: 2, borderColor: "#F5B72C", borderRadius: 12 },
  hint: { position: "absolute", bottom: 10, left: 0, right: 0, color: "#FFF", textAlign: "center", fontSize: 13, fontWeight: "bold" },
  box: { gap: 10, padding: 16, backgroundColor: "#121D31", borderRadius: 18, borderWidth: 1, borderColor: "#293B59" },
  boxTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "bold", textAlign: "right" },
  input: { color: "#FFF", backgroundColor: "#0B1224", borderColor: "#3A5278", borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  btnPrimary: { backgroundColor: "#F5B72C", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  btnPrimaryText: { color: "#101827", fontSize: 15, fontWeight: "bold" },
  btnSecondary: { borderWidth: 1, borderColor: "#F5B72C", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnSecondaryText: { color: "#F5B72C", fontSize: 15, fontWeight: "bold" },
  centerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, padding: 10 },
  statusText: { color: "#F5B72C", fontSize: 14, fontWeight: "bold" },
  resultBox: { padding: 16, backgroundColor: "#162B20", borderRadius: 16, borderWidth: 1, borderColor: "#3A7D52" },
  resultText: { color: "#E8FFF0", fontSize: 15, lineHeight: 22, textAlign: "right" },
  fallbackRow: { flexDirection: "row-reverse", gap: 10 },
  btnSmall: { flex: 1, backgroundColor: "#243A61", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnSmallText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
});