import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

type Plan = {
  name: "free" | "basic" | "pro" | "enterprise";
  displayName: string;
  pricePerMonth: number;
  listingLimit: number;
  imageLimit: number;
  videoLimit: number;
  features?: string[];
};

type Subscription = {
  plan: string;
  status: string;
  endDate: string;
  listingCount: number;
  listingLimit: number;
};

type PaymentState = "success" | "pending" | "failed" | "cancelled" | "error" | null;

const stateCopy: Record<Exclude<PaymentState, null>, { title: string; text: string; color: string }> = {
  success: { title: "Payment successful", text: "Your subscription is active.", color: "#16a34a" },
  pending: { title: "Payment pending", text: "We are waiting for payment confirmation. This page will refresh when it is received.", color: "#d97706" },
  failed: { title: "Payment failed", text: "No plan change was made. You can try again.", color: "#dc2626" },
  cancelled: { title: "Payment cancelled", text: "No charge was made.", color: "#6b7280" },
  error: { title: "Payment status unavailable", text: "Please refresh to check your current plan.", color: "#dc2626" },
};
const PENDING_PAYMENT_STORAGE_KEY = "inndos.pendingSubscriptionPayment";

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { payment, paymentId: paymentIdParam } = useLocalSearchParams<{ payment?: string; paymentId?: string }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>(null);
  const [loading, setLoading] = useState(true);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [plansResponse, subscriptionResponse] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/subscriptions/plans`, { headers }),
        fetch(`${getApiBaseUrl()}/api/subscriptions/me`, { headers }),
      ]);
      if (!plansResponse.ok || !subscriptionResponse.ok) throw new Error("Unable to load subscription details");
      setPlans(await plansResponse.json());
      setSubscription(await subscriptionResponse.json());
    } catch {
      Alert.alert("Could not load plans", "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    if (!token) return;
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/subscriptions/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return;
      const paymentResult = await response.json() as { status: "pending" | "completed" | "failed" | "cancelled" };
      const nextState: PaymentState = paymentResult.status === "completed" ? "success" : paymentResult.status;
      setPaymentState(nextState);
      if (nextState !== "pending") {
        setActivePaymentId(null);
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
        await load();
      }
    } catch {
      // Keep the saved id. A later foreground cycle can reconcile it.
    }
  }, [load, token]);

  useEffect(() => {
    if (!token) return;
    void AsyncStorage.getItem(PENDING_PAYMENT_STORAGE_KEY).then((savedId) => {
      if (savedId) {
        setActivePaymentId(savedId);
        void checkPaymentStatus(savedId);
      }
    });
  }, [checkPaymentStatus, token]);

  useEffect(() => {
    const returnedState = typeof payment === "string" ? payment as PaymentState : null;
    if (returnedState) setPaymentState(returnedState);
    if (paymentIdParam) {
      setActivePaymentId(paymentIdParam);
      void AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, paymentIdParam);
      if (returnedState !== "cancelled" && returnedState !== "failed") void checkPaymentStatus(paymentIdParam);
    }
  }, [checkPaymentStatus, payment, paymentIdParam]);

  useEffect(() => {
    if (!activePaymentId || paymentState !== "pending") return;
    const interval = setInterval(() => { void checkPaymentStatus(activePaymentId); }, 5000);
    return () => clearInterval(interval);
  }, [activePaymentId, checkPaymentStatus, paymentState]);

  const startCheckout = async (plan: Plan) => {
    if (!token || plan.name === "free") return;
    if (plan.name === "enterprise") {
      Alert.alert("Enterprise plan", "Enterprise pricing is custom. Please contact the INNDOS team to request access.");
      return;
    }
    setPayingPlan(plan.name);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/subscriptions/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.name, billingCycle: "monthly", months: 1, returnTarget: "mobile" }),
      });
      const checkout = await response.json() as { redirectUrl?: string; paymentId?: string; error?: string };
      if (!response.ok || !checkout.redirectUrl || !checkout.paymentId) {
        throw new Error(checkout.error ?? "Could not start checkout");
      }
      setActivePaymentId(checkout.paymentId);
      await AsyncStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, checkout.paymentId);

      const result = await WebBrowser.openAuthSessionAsync(
        checkout.redirectUrl,
        "inndos-mobile://subscription"
      );
      const resultUrl = "url" in result ? result.url : "";
      const returnedState = resultUrl
        ? new URL(resultUrl).searchParams.get("payment") as PaymentState
        : null;
      if (returnedState) setPaymentState(returnedState);
      if (returnedState !== "cancelled" && returnedState !== "failed") {
        await checkPaymentStatus(checkout.paymentId);
      } else {
        setActivePaymentId(null);
        await AsyncStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
      }
    } catch (error) {
      setPaymentState("error");
      Alert.alert("Checkout could not start", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPayingPlan(null);
    }
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to manage a plan</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login")}>
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="arrow-left" size={22} color={colors.foreground} /></Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Subscription</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {paymentState && (
          <View style={[styles.stateCard, { borderColor: stateCopy[paymentState].color, backgroundColor: colors.card }]}>
            <Text style={[styles.stateTitle, { color: stateCopy[paymentState].color }]}>{stateCopy[paymentState].title}</Text>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{stateCopy[paymentState].text}</Text>
          </View>
        )}
        {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
          <>
            <View style={[styles.currentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>CURRENT PACKAGE</Text>
              <Text style={[styles.currentPlan, { color: colors.foreground }]}>{subscription?.plan ?? "free"} plan</Text>
              <Text style={[styles.currentMeta, { color: colors.mutedForeground }]}>
                {subscription?.status ?? "active"} · {subscription?.listingCount ?? 0}/{subscription?.listingLimit ?? 3} listings used
              </Text>
              {subscription?.plan !== "free" && <Text style={[styles.currentMeta, { color: colors.mutedForeground }]}>Renews or ends {subscription?.endDate}</Text>}
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose a package</Text>
            {plans.filter((plan) => plan.name !== "free" || subscription?.plan === "free").map((plan) => {
              const isCurrent = subscription?.plan === plan.name;
              return (
                <View key={plan.name} style={[styles.planCard, { backgroundColor: colors.card, borderColor: isCurrent ? colors.primary : colors.border }]}>
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={[styles.planName, { color: colors.foreground }]}>{plan.displayName ?? plan.name}</Text>
                      <Text style={[styles.price, { color: colors.foreground }]}>{plan.pricePerMonth ? `KES ${plan.pricePerMonth}/month` : "Custom pricing"}</Text>
                    </View>
                    {isCurrent && <Text style={[styles.currentBadge, { color: colors.primary, borderColor: colors.primary }]}>Current</Text>}
                  </View>
                  <Text style={[styles.featureText, { color: colors.mutedForeground }]}>
                    {plan.listingLimit >= 2147483647 ? "Unlimited" : plan.listingLimit} listings · {plan.imageLimit} photos · {plan.videoLimit} video{plan.videoLimit === 1 ? "" : "s"}
                  </Text>
                  <Pressable
                    style={[styles.planButton, { backgroundColor: isCurrent ? colors.muted : colors.primary, opacity: payingPlan && payingPlan !== plan.name ? 0.55 : 1 }]}
                    disabled={isCurrent || !!payingPlan}
                    onPress={() => void startCheckout(plan)}
                  >
                    {payingPlan === plan.name ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.planButtonText, { color: isCurrent ? colors.mutedForeground : colors.primaryForeground }]}>{isCurrent ? "Active package" : plan.name === "enterprise" ? "Contact us" : "Choose package"}</Text>}
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Outfit_700Bold", fontSize: 22 },
  content: { paddingHorizontal: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 18 },
  primaryButton: { paddingVertical: 13, paddingHorizontal: 28, borderRadius: 10 },
  primaryButtonText: { fontFamily: "Outfit_600SemiBold", fontSize: 15 },
  stateCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  stateTitle: { fontFamily: "Outfit_700Bold", fontSize: 15 },
  stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 18 },
  currentCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 5 },
  eyebrow: { fontFamily: "Outfit_600SemiBold", fontSize: 10, letterSpacing: 1 },
  currentPlan: { fontFamily: "Outfit_700Bold", fontSize: 22, textTransform: "capitalize" },
  currentMeta: { fontFamily: "Outfit_400Regular", fontSize: 13 },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, marginTop: 8 },
  planCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontFamily: "Outfit_700Bold", fontSize: 18, textTransform: "capitalize" },
  price: { fontFamily: "Outfit_500Medium", fontSize: 14, marginTop: 2 },
  currentBadge: { borderWidth: 1, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 8, fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  featureText: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 18 },
  planButton: { minHeight: 44, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  planButtonText: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
});