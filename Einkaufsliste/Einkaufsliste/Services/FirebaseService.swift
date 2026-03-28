import Foundation
import FirebaseDatabase

class FirebaseService {
    static let shared = FirebaseService()

    private let database = Database.database().reference()
    private var itemsHandle: DatabaseHandle?
    private var currentListId: String?

    private init() {
        Database.database().isPersistenceEnabled = true
    }

    // MARK: - Listen-ID Verwaltung

    var listId: String {
        get {
            if let stored = UserDefaults.standard.string(forKey: "listId") {
                return stored
            }
            let newId = generateListId()
            UserDefaults.standard.set(newId, forKey: "listId")
            return newId
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "listId")
        }
    }

    private func generateListId() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<6).map { _ in chars.randomElement()! })
    }

    private func itemsRef() -> DatabaseReference {
        return database.child("lists").child(listId).child("items")
    }

    // MARK: - Echtzeit-Beobachtung

    func observeItems(onChange: @escaping ([ShoppingItem]) -> Void) {
        // Vorherigen Listener entfernen
        stopObserving()
        currentListId = listId

        itemsHandle = itemsRef().observe(.value) { snapshot in
            var items: [ShoppingItem] = []

            for child in snapshot.children {
                guard let childSnapshot = child as? DataSnapshot,
                      let dict = childSnapshot.value as? [String: Any],
                      let item = ShoppingItem.fromDictionary(dict) else {
                    continue
                }
                items.append(item)
            }

            DispatchQueue.main.async {
                onChange(items)
            }
        }
    }

    func stopObserving() {
        if let handle = itemsHandle, let oldListId = currentListId {
            database.child("lists").child(oldListId).child("items")
                .removeObserver(withHandle: handle)
            itemsHandle = nil
            currentListId = nil
        }
    }

    // MARK: - Artikel-Operationen

    func addItem(_ item: ShoppingItem) {
        itemsRef().child(item.id).setValue(item.toDictionary())
    }

    func toggleItem(_ item: ShoppingItem) {
        let updates: [String: Any] = [
            "isChecked": !item.isChecked,
            "checkedAt": item.isChecked ? NSNull() : Date().timeIntervalSince1970
        ]
        itemsRef().child(item.id).updateChildValues(updates)
    }

    func deleteItem(_ item: ShoppingItem) {
        itemsRef().child(item.id).removeValue()
    }

    func deleteCheckedItems(_ items: [ShoppingItem]) {
        let checkedItems = items.filter { $0.isChecked }
        for item in checkedItems {
            itemsRef().child(item.id).removeValue()
        }
    }

    func deleteAllItems() {
        itemsRef().removeValue()
    }

    // MARK: - Liste wechseln

    func switchToList(id: String, onChange: @escaping ([ShoppingItem]) -> Void) {
        listId = id
        observeItems(onChange: onChange)
    }

    func createNewList(onChange: @escaping ([ShoppingItem]) -> Void) -> String {
        let newId = generateListId()
        listId = newId
        observeItems(onChange: onChange)
        return newId
    }
}
