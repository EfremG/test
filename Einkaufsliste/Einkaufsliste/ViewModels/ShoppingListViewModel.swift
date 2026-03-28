import Foundation
import Combine

class ShoppingListViewModel: ObservableObject {
    @Published var items: [ShoppingItem] = []
    @Published var listId: String = ""

    private let firebaseService = FirebaseService.shared
    private let authService = AuthService.shared

    struct CategoryGroup: Identifiable {
        let category: ShoppingCategory
        let items: [ShoppingItem]
        var id: String { category.rawValue }
    }

    var groupedItems: [CategoryGroup] {
        let unchecked = items.filter { !$0.isChecked }
        let grouped = Dictionary(grouping: unchecked) { $0.category }

        return ShoppingCategory.allCases.compactMap { category in
            guard let categoryItems = grouped[category], !categoryItems.isEmpty else {
                return nil
            }
            let sorted = categoryItems.sorted { $0.createdAt < $1.createdAt }
            return CategoryGroup(category: category, items: sorted)
        }
    }

    var checkedItems: [ShoppingItem] {
        items.filter { $0.isChecked }
            .sorted { ($0.checkedAt ?? 0) > ($1.checkedAt ?? 0) }
    }

    var hasCheckedItems: Bool {
        items.contains { $0.isChecked }
    }

    init() {
        listId = firebaseService.listId
        startObserving()
    }

    func startObserving() {
        listId = firebaseService.listId
        firebaseService.observeItems { [weak self] items in
            self?.items = items
        }
    }

    func addItem(name: String, category: ShoppingCategory) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let item = ShoppingItem(
            name: trimmed,
            category: category,
            addedBy: authService.userId
        )
        firebaseService.addItem(item)
    }

    func toggleItem(_ item: ShoppingItem) {
        firebaseService.toggleItem(item)
    }

    func deleteItem(_ item: ShoppingItem) {
        firebaseService.deleteItem(item)
    }

    func deleteCheckedItems() {
        firebaseService.deleteCheckedItems(items)
    }

    func deleteAllItems() {
        firebaseService.deleteAllItems()
    }

    func joinList(id: String) {
        let trimmedId = id.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !trimmedId.isEmpty else { return }

        firebaseService.switchToList(id: trimmedId) { [weak self] items in
            self?.items = items
        }
        listId = trimmedId
    }

    func createNewList() {
        let newId = firebaseService.createNewList { [weak self] items in
            self?.items = items
        }
        listId = newId
    }
}
