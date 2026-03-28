import SwiftUI

struct AddItemView: View {
    @ObservedObject var viewModel: ShoppingListViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var itemName: String = ""
    @State private var selectedCategory: ShoppingCategory = .sonstiges
    @State private var addedCount: Int = 0
    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Artikel eingeben...", text: $itemName)
                        .focused($isTextFieldFocused)
                        .onSubmit {
                            addItem()
                        }
                        .submitLabel(.done)
                }

                Section("Kategorie") {
                    Picker("Kategorie", selection: $selectedCategory) {
                        ForEach(ShoppingCategory.allCases) { category in
                            Label(category.rawValue, systemImage: category.icon)
                                .tag(category)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                Section {
                    Button(action: addItem) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Hinzufügen")
                        }
                        .frame(maxWidth: .infinity)
                        .font(.headline)
                    }
                    .disabled(itemName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if addedCount > 0 {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("\(addedCount) Artikel hinzugefügt")
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Neuer Artikel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fertig") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                isTextFieldFocused = true
            }
        }
    }

    private func addItem() {
        let trimmed = itemName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        viewModel.addItem(name: trimmed, category: selectedCategory)
        itemName = ""
        addedCount += 1
        isTextFieldFocused = true
    }
}
