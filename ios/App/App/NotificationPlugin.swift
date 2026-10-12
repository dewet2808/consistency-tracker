import Foundation
import Capacitor
import UserNotifications

@objc(NotificationPlugin)
public class NotificationPlugin: CAPPlugin {

    @objc func schedule(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["daily_reminder", "streak_reminder"])

        let dailyEnabled  = call.getBool("dailyEnabled")  ?? false
        let streakEnabled = call.getBool("streakEnabled") ?? false
        let dailyHour     = call.getInt("dailyHour")      ?? 8
        let dailyMinute   = call.getInt("dailyMinute")    ?? 0
        let streakHour    = call.getInt("streakHour")     ?? 21
        let streakMinute  = call.getInt("streakMinute")   ?? 0

        let group = DispatchGroup()

        if dailyEnabled {
            let content = UNMutableNotificationContent()
            content.title = "Daily check-in"
            content.body  = "Don't break your streak — tick off your habits now."
            content.sound = .default

            var comps = DateComponents()
            comps.hour   = dailyHour
            comps.minute = dailyMinute

            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            let request = UNNotificationRequest(identifier: "daily_reminder", content: content, trigger: trigger)
            group.enter()
            center.add(request) { _ in group.leave() }
        }

        if streakEnabled {
            let content = UNMutableNotificationContent()
            content.title = "Don't break your streak!"
            content.body  = "You still have habits to complete today."
            content.sound = .default

            var comps = DateComponents()
            comps.hour   = streakHour
            comps.minute = streakMinute

            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
            let request = UNNotificationRequest(identifier: "streak_reminder", content: content, trigger: trigger)
            group.enter()
            center.add(request) { _ in group.leave() }
        }

        group.notify(queue: .main) { call.resolve() }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: ["daily_reminder", "streak_reminder"])
        call.resolve()
    }
}
