import UIKit
import Capacitor
import WebKit

// Subclass of CAPBridgeViewController so we can register the JS→Swift notification
// handler inside capacitorDidLoad() — the one place Capacitor guarantees both
// `webView` and `bridge` are fully initialised before being called.
class NotificationBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // webView is non-nil by the time capacitorDidLoad() is called (set in loadView before this)
        webView?.configuration.userContentController.add(self, name: "notificationScheduler")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "notificationScheduler",
              let body = message.body as? [String: Any] else { return }
        let de = body["dailyEnabled"]  as? Bool   ?? false
        let dt = body["dailyTime"]     as? String ?? "08:00"
        let se = body["streakEnabled"] as? Bool   ?? false
        let st = body["streakTime"]    as? String ?? "21:00"
        (UIApplication.shared.delegate as? AppDelegate)?.cacheAndSchedule(
            dailyEnabled: de, dailyTime: dt, streakEnabled: se, streakTime: st
        )
    }
}
