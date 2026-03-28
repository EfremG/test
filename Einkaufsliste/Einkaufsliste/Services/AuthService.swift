import Foundation
import FirebaseAuth

class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var userId: String = ""
    @Published var isAuthenticated: Bool = false

    private init() {}

    func signInAnonymously() {
        Auth.auth().signInAnonymously { [weak self] result, error in
            guard let self = self else { return }

            if let error = error {
                print("Fehler bei der Anmeldung: \(error.localizedDescription)")
                return
            }

            if let user = result?.user {
                DispatchQueue.main.async {
                    self.userId = user.uid
                    self.isAuthenticated = true
                }
            }
        }
    }
}
