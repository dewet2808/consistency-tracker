import { Capacitor } from '@capacitor/core'

let Purchases = null
let isAvailable = false

export async function initPurchases(userId) {
  if (!Capacitor.isNativePlatform()) return
  try {
    const mod = await import('@revenuecat/purchases-capacitor')
    Purchases = mod.Purchases
    await Purchases.configure({
      apiKey: import.meta.env.VITE_REVENUECAT_IOS_KEY,
      appUserID: userId,
    })
    isAvailable = true
  } catch (e) {
    console.warn('RevenueCat init failed:', e)
  }
}

export async function checkProEntitlement() {
  if (!isAvailable || !Purchases) return false
  try {
    const { customerInfo } = await Purchases.getCustomerInfo()
    return !!customerInfo.entitlements.active['pro']
  } catch {
    return false
  }
}

export async function getAllPackages() {
  if (!isAvailable || !Purchases) return { monthly: null, annual: null, lifetime: null }
  try {
    const { offerings } = await Purchases.getOfferings()
    const current = offerings.current
    return {
      monthly:  current?.monthly  ?? null,
      annual:   current?.annual   ?? null,
      lifetime: current?.lifetime ?? null,
    }
  } catch {
    return { monthly: null, annual: null, lifetime: null }
  }
}

export async function purchasePackage(pkg) {
  if (!pkg) throw new Error('No package')
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return !!customerInfo.entitlements.active['pro']
}

// kept for backwards compat
export async function getMonthlyPackage() {
  const { monthly } = await getAllPackages()
  return monthly
}

export async function purchaseMonthly() {
  const pkg = await getMonthlyPackage()
  return purchasePackage(pkg)
}

export async function restorePurchases() {
  if (!isAvailable || !Purchases) return false
  try {
    const { customerInfo } = await Purchases.restorePurchases()
    return !!customerInfo.entitlements.active['pro']
  } catch {
    return false
  }
}

export function isNativeIOS() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

export async function checkProEntitlementWeb(supabaseClient) {
  try {
    const { data, error } = await supabaseClient.functions.invoke('check-subscription')
    if (error) return false
    return !!data?.isPro
  } catch {
    return false
  }
}
