import UIKit
import Capacitor
import UserNotifications
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let prefsKey = "com.dewet.daily.notif_prefs"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        return true
    }

    // Called on every foreground — reads localStorage and reschedules as a belt-and-suspenders backup.
    func applicationDidBecomeActive(_ application: UIApplication) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.syncFromLocalStorage()
        }
    }

    // Reschedule synchronously from cached prefs on every resign — handles immediate kills.
    func applicationWillResignActive(_ application: UIApplication) {
        guard let prefs = UserDefaults.standard.dictionary(forKey: prefsKey) else { return }
        scheduleNative(
            dailyEnabled:  prefs["dailyEnabled"]  as? Bool   ?? false,
            dailyTime:     prefs["dailyTime"]     as? String ?? "08:00",
            streakEnabled: prefs["streakEnabled"] as? Bool   ?? false,
            streakTime:    prefs["streakTime"]    as? String ?? "21:00"
        )
    }

    // Called by NotificationBridgeViewController when JS posts a message.
    func cacheAndSchedule(dailyEnabled: Bool, dailyTime: String, streakEnabled: Bool, streakTime: String) {
        cachePrefs(dailyEnabled: dailyEnabled, dailyTime: dailyTime, streakEnabled: streakEnabled, streakTime: streakTime)
        scheduleNative(dailyEnabled: dailyEnabled, dailyTime: dailyTime, streakEnabled: streakEnabled, streakTime: streakTime)
    }

    private func syncFromLocalStorage() {
        guard let vc = window?.rootViewController as? NotificationBridgeViewController,
              let webView = vc.webView else { return }
        webView.evaluateJavaScript("""
            JSON.stringify({
                e:  localStorage.getItem('daily_reminder_enabled'),
                t:  localStorage.getItem('daily_reminder_time')   || '08:00',
                se: localStorage.getItem('streak_reminder_enabled'),
                st: localStorage.getItem('streak_reminder_time')  || '21:00'
            })
        """) { result, _ in
            guard let json  = result as? String,
                  let data  = json.data(using: .utf8),
                  let prefs = try? JSONSerialization.jsonObject(with: data) as? [String: String]
            else { return }
            let de = prefs["e"]  == "true"
            let dt = prefs["t"]  ?? "08:00"
            let se = prefs["se"] == "true"
            let st = prefs["st"] ?? "21:00"
            self.cachePrefs(dailyEnabled: de, dailyTime: dt, streakEnabled: se, streakTime: st)
            self.scheduleNative(dailyEnabled: de, dailyTime: dt, streakEnabled: se, streakTime: st)
        }
    }

    private func cachePrefs(dailyEnabled: Bool, dailyTime: String, streakEnabled: Bool, streakTime: String) {
        UserDefaults.standard.set([
            "dailyEnabled":  dailyEnabled,
            "dailyTime":     dailyTime,
            "streakEnabled": streakEnabled,
            "streakTime":    streakTime,
        ] as [String: Any], forKey: prefsKey)
    }

    private func scheduleNative(dailyEnabled: Bool, dailyTime: String, streakEnabled: Bool, streakTime: String) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["daily_reminder", "streak_reminder"])

        func parts(_ t: String) -> (Int, Int) {
            let s = t.split(separator: ":").map { Int($0) ?? 0 }
            return (s.count > 1 ? s[0] : 8, s.count > 1 ? s[1] : 0)
        }

        if dailyEnabled {
            let (h, m) = parts(dailyTime)
            let content = UNMutableNotificationContent()
            content.title = "Daily check-in"
            content.body  = "Don't break your streak — tick off your habits now."
            content.sound = .default
            var comps = DateComponents(); comps.hour = h; comps.minute = m
            center.add(UNNotificationRequest(
                identifier: "daily_reminder", content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            ))
        }

        if streakEnabled {
            let (h, m) = parts(streakTime)
            let content = UNMutableNotificationContent()
            content.title = "Don't break your streak!"
            content.body  = "You still have habits to complete today."
            content.sound = .default
            var comps = DateComponents(); comps.hour = h; comps.minute = m
            center.add(UNNotificationRequest(
                identifier: "streak_reminder", content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            ))
        }
    }

    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
