import SwiftUI
import FirebaseCore

@main
struct EinkaufslisteApp: App {

    init() {
        FirebaseApp.configure()
        AuthService.shared.signInAnonymously()
    }

    var body: some Scene {
        WindowGroup {
            ShoppingListView()
        }
    }
}
