import SwiftUI

struct ShoppingListView: View {
    @StateObject private var viewModel = ShoppingListViewModel()
    @State private var showAddItem = false
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.items.isEmpty {
                    emptyStateView
                } else {
                    listView
                }
            }
            .navigationTitle("Einkaufsliste")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddItem = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddItem) {
                AddItemView(viewModel: viewModel)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(viewModel: viewModel)
            }
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "cart")
                .font(.system(size: 64))
                .foregroundColor(.secondary)

            Text("Keine Artikel")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Tippe auf + um Artikel hinzuzufügen")
                .foregroundColor(.secondary)

            Text("Listen-ID: \(viewModel.listId)")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.top, 8)
        }
    }

    private var listView: some View {
        List {
            // Nicht erledigte Artikel nach Kategorie gruppiert
            ForEach(viewModel.groupedItems) { group in
                Section {
                    ForEach(group.items) { item in
                        ItemRowView(item: item) {
                            viewModel.toggleItem(item)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                viewModel.deleteItem(item)
                            } label: {
                                Label("Löschen", systemImage: "trash")
                            }
                        }
                    }
                } header: {
                    Label(group.category.rawValue, systemImage: group.category.icon)
                        .foregroundColor(group.category.color)
                        .font(.subheadline.weight(.semibold))
                }
            }

            // Erledigte Artikel
            if !viewModel.checkedItems.isEmpty {
                Section {
                    ForEach(viewModel.checkedItems) { item in
                        ItemRowView(item: item) {
                            viewModel.toggleItem(item)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                            Button(role: .destructive) {
                                viewModel.deleteItem(item)
                            } label: {
                                Label("Löschen", systemImage: "trash")
                            }
                        }
                    }
                } header: {
                    HStack {
                        Label("Erledigt", systemImage: "checkmark.circle")
                        Spacer()
                        Button("Alle entfernen") {
                            viewModel.deleteCheckedItems()
                        }
                        .font(.caption)
                        .foregroundColor(.red)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .animation(.default, value: viewModel.items)
    }
}
