import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: ShoppingListViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var joinListId: String = ""
    @State private var showDeleteAllAlert = false
    @State private var showNewListAlert = false
    @State private var copiedToClipboard = false

    var body: some View {
        NavigationStack {
            Form {
                // Aktuelle Liste
                Section("Aktuelle Liste") {
                    HStack {
                        Text("Listen-ID")
                        Spacer()
                        Text(viewModel.listId)
                            .font(.system(.body, design: .monospaced))
                            .fontWeight(.bold)
                    }

                    Button {
                        UIPasteboard.general.string = viewModel.listId
                        copiedToClipboard = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            copiedToClipboard = false
                        }
                    } label: {
                        HStack {
                            Image(systemName: copiedToClipboard ? "checkmark" : "doc.on.doc")
                            Text(copiedToClipboard ? "Kopiert!" : "Listen-ID kopieren")
                        }
                    }

                    ShareLink(
                        item: "Tritt meiner Einkaufsliste bei! Listen-ID: \(viewModel.listId)",
                        subject: Text("Einkaufsliste"),
                        message: Text("Nutze diese ID in der Einkaufsliste-App: \(viewModel.listId)")
                    ) {
                        Label("Listen-ID teilen", systemImage: "square.and.arrow.up")
                    }
                }

                // Liste beitreten
                Section("Einer Liste beitreten") {
                    TextField("Listen-ID eingeben", text: $joinListId)
                        .textInputAutocapitalization(.characters)
                        .font(.system(.body, design: .monospaced))

                    Button {
                        viewModel.joinList(id: joinListId)
                        joinListId = ""
                        dismiss()
                    } label: {
                        Label("Liste beitreten", systemImage: "person.2.fill")
                    }
                    .disabled(joinListId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                // Neue Liste
                Section {
                    Button {
                        showNewListAlert = true
                    } label: {
                        Label("Neue Liste erstellen", systemImage: "plus.rectangle.on.rectangle")
                    }
                    .alert("Neue Liste erstellen?", isPresented: $showNewListAlert) {
                        Button("Abbrechen", role: .cancel) {}
                        Button("Erstellen") {
                            viewModel.createNewList()
                        }
                    } message: {
                        Text("Du verlässt die aktuelle Liste und erstellst eine neue. Die alte Liste bleibt bestehen, wenn du die ID behältst.")
                    }
                }

                // Gefahrenzone
                Section {
                    Button(role: .destructive) {
                        showDeleteAllAlert = true
                    } label: {
                        Label("Alle Artikel löschen", systemImage: "trash.fill")
                    }
                    .alert("Alle Artikel löschen?", isPresented: $showDeleteAllAlert) {
                        Button("Abbrechen", role: .cancel) {}
                        Button("Löschen", role: .destructive) {
                            viewModel.deleteAllItems()
                        }
                    } message: {
                        Text("Alle Artikel in dieser Liste werden unwiderruflich gelöscht. Dies betrifft auch die Liste deines Partners.")
                    }
                }

                // Info
                Section("Info") {
                    HStack {
                        Text("Artikel in der Liste")
                        Spacer()
                        Text("\(viewModel.items.count)")
                            .foregroundColor(.secondary)
                    }

                    Text("Teile die Listen-ID mit deinem Partner, damit ihr beide die gleiche Einkaufsliste verwenden könnt. Alle Änderungen werden in Echtzeit synchronisiert.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Einstellungen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Fertig") {
                        dismiss()
                    }
                }
            }
        }
    }
}
