import Foundation

struct ShoppingItem: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var category: ShoppingCategory
    var isChecked: Bool
    var addedBy: String
    var createdAt: TimeInterval
    var checkedAt: TimeInterval?

    init(
        id: String = UUID().uuidString,
        name: String,
        category: ShoppingCategory = .sonstiges,
        isChecked: Bool = false,
        addedBy: String = "",
        createdAt: TimeInterval = Date().timeIntervalSince1970,
        checkedAt: TimeInterval? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.isChecked = isChecked
        self.addedBy = addedBy
        self.createdAt = createdAt
        self.checkedAt = checkedAt
    }

    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = [
            "id": id,
            "name": name,
            "category": category.rawValue,
            "isChecked": isChecked,
            "addedBy": addedBy,
            "createdAt": createdAt
        ]
        if let checkedAt = checkedAt {
            dict["checkedAt"] = checkedAt
        }
        return dict
    }

    static func fromDictionary(_ dict: [String: Any]) -> ShoppingItem? {
        guard let id = dict["id"] as? String,
              let name = dict["name"] as? String,
              let categoryRaw = dict["category"] as? String,
              let category = ShoppingCategory(rawValue: categoryRaw),
              let isChecked = dict["isChecked"] as? Bool,
              let addedBy = dict["addedBy"] as? String,
              let createdAt = dict["createdAt"] as? TimeInterval else {
            return nil
        }

        return ShoppingItem(
            id: id,
            name: name,
            category: category,
            isChecked: isChecked,
            addedBy: addedBy,
            createdAt: createdAt,
            checkedAt: dict["checkedAt"] as? TimeInterval
        )
    }
}
