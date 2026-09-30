import SwiftUI
import LocalAuthentication
import UniformTypeIdentifiers

struct SharedFile: Identifiable { var id = UUID(); var url: URL }
struct NativeRootView: View {
    @Bindable var store: ProjectStore
    @State private var selectedTab = 0
    @State private var importVisible = false
    @State private var share: SharedFile?
    @State private var search = ""
    @State private var activeProject: UUID?
    @AppStorage("native.biometricLock") private var biometricLock = false
    @State private var unlocked = false
    @State private var authenticating = false
    @Environment(\.scenePhase) private var phase
    var body: some View {
        Group {
            if biometricLock && !unlocked {
                VStack(spacing: 24) {
                    Image(systemName: "lock.shield").font(.system(size: 64)).foregroundStyle(.teal)
                    Text("Deine Immobilien").font(.largeTitle.bold())
                    Text("Entsperre deine lokal gespeicherten Bewertungen.").foregroundStyle(.secondary)
                    Button("Entsperren", action: unlock).buttonStyle(.borderedProminent).disabled(authenticating)
                }.padding()
            } else {
                tabs
            }
        }
        .tint(.teal)
        .onChange(of: phase) { _, value in if value == .background { unlocked = false } }
        .task { if biometricLock { unlock() } }
        .alert("ImmoApp", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) { Button("OK") { store.errorMessage = nil } } message: { Text(store.errorMessage ?? "") }
        .fileImporter(isPresented: $importVisible, allowedContentTypes: [.json], allowsMultipleSelection: false) { result in
            do {
                guard let url = try result.get().first else { return }
                let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                try store.importData(Data(contentsOf: url)); selectedTab = 1
            } catch { store.errorMessage = error.localizedDescription }
        }
        .sheet(item: $share) { SharedActivity(url: $0.url) }
    }
    private var tabs: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Immobilien im Blick").font(.largeTitle.bold())
                            Text("Erfassen. Prüfen. Bewerten.").foregroundStyle(.secondary)
                        }
                        Button(action: create) { Label("Neue Bewertung", systemImage: "plus.circle.fill").font(.headline).frame(maxWidth: .infinity).padding(12) }.buttonStyle(.borderedProminent).accessibilityIdentifier("newProperty")
                        HStack {
                            Label("\(store.projects.count) Objekte", systemImage: "building.2")
                            Spacer(); Text("Lokal gespeichert").font(.caption).foregroundStyle(.secondary)
                        }
                        if store.projects.isEmpty {
                            ContentUnavailableView("Dein erstes Objekt", systemImage: "house", description: Text("Lege eine Immobilie an oder importiere eine bestehende Bewertung."))
                            Button("Bewertung importieren") { importVisible = true }.frame(maxWidth: .infinity)
                        } else {
                            Text("Zuletzt bearbeitet").font(.headline)
                            ForEach(store.projects.prefix(5)) { p in
                                NavigationLink { PropertyDetailView(store: store, projectID: p.id) } label: { PropertyRow(project: p) }.buttonStyle(.plain)
                            }
                        }
                    }.padding()
                }.background(Color(.systemGroupedBackground))
                .navigationTitle("Übersicht").navigationBarTitleDisplayMode(.inline)
                .navigationDestination(item: $activeProject) { PropertyDetailView(store: store, projectID: $0) }
            }.tabItem { Label("Übersicht", systemImage: "house") }.tag(0)
            NavigationStack {
                List {
                    ForEach(store.projects.filter { search.isEmpty || ($0.name + $0.address).localizedCaseInsensitiveContains(search) }) { p in
                        NavigationLink { PropertyDetailView(store: store, projectID: p.id) } label: { PropertyRow(project: p) }
                        .swipeActions { Button("Löschen", role: .destructive) { do { try store.remove(p.id) } catch { store.errorMessage = error.localizedDescription } } }
                        .contextMenu { Button("Duplizieren", systemImage: "doc.on.doc") { do { try store.duplicate(p.id) } catch { store.errorMessage = error.localizedDescription } } }
                    }
                }.overlay { if store.projects.isEmpty { ContentUnavailableView("Keine Objekte", systemImage: "building.2", description: Text("Neue Bewertung über Übersicht anlegen.")) } }
                .searchable(text: $search, prompt: "Name oder Anschrift")
                .navigationTitle("Objekte")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Importieren", systemImage: "square.and.arrow.down") { importVisible = true } } }
            }.tabItem { Label("Objekte", systemImage: "building.2") }.tag(1)
            NavigationStack {
                Form {
                    Section("Datensicherung") {
                        Button("Bewertung oder Sicherung importieren", systemImage: "square.and.arrow.down") { importVisible = true }
                        Button("Alle Bewertungen sichern", systemImage: "square.and.arrow.up") { do { share = SharedFile(url: try store.exportBackup()) } catch { store.errorMessage = error.localizedDescription } }.disabled(store.projects.isEmpty)
                    }
                    Section("Ausprobieren") {
                        Button("Testimmobilien hinzufügen", systemImage:"building.2.crop.circle") {
                            do {
                                let added = try store.addTestProperties()
                                store.errorMessage = added > 0 ? "Sechs fiktive Testimmobilien wurden ergänzt. Du findest sie unter Objekte mit dem Präfix TEST." : "Die Testimmobilien sind bereits vorhanden."
                            } catch { store.errorMessage = error.localizedDescription }
                        }
                        Text("Sechs fiktive Fälle zum Ausprobieren. Bereits vorhandene Bewertungen bleiben erhalten.").font(.footnote).foregroundStyle(.secondary)
                    }
                    Section("Schutz") {
                        Toggle("Gerätesperre verwenden", isOn: Binding(get: { biometricLock }, set: { enabled in if enabled { enableLock() } else { biometricLock = false; unlocked = false } }))
                        Text("Gespeicherte Dateien nutzen den iOS-Dateischutz. Sicherungsdateien enthalten deine Bewertungsdaten.").font(.footnote).foregroundStyle(.secondary)
                    }
                    Section("Bewertungsgrundlagen") {
                        Text("Quellen, Modellbezug und Gewichtung dokumentieren. Die Vollständigkeitsprüfung ersetzt keine fachliche Prüfung der tatsächlichen Marktdaten.")
                        Link("ImmoWertV", destination: URL(string: "https://www.gesetze-im-internet.de/immowertv_2022/BJNR280500021.html")!)
                        Link("BelWertV", destination: URL(string: "https://www.gesetze-im-internet.de/belwertv/BJNR117500006.html")!)
                    }
                }.navigationTitle("Mehr")
            }.tabItem { Label("Mehr", systemImage: "ellipsis.circle") }.tag(2)
        }
    }
    private func create() { do { activeProject = try store.create() } catch { store.errorMessage = error.localizedDescription } }
    private func unlock() {
        guard !authenticating else { return }; authenticating = true
        LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Immobilienbewertungen öffnen") { success, _ in
            Task { @MainActor in unlocked = success; authenticating = false }
        }
    }
    private func enableLock() {
        LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Gerätesperre für ImmoApp aktivieren") { success, error in
            Task { @MainActor in if success { biometricLock = true; unlocked = true } else { store.errorMessage = error?.localizedDescription ?? "Gerätesperre konnte nicht aktiviert werden." } }
        }
    }
}
struct PropertyRow: View {
    var project: PropertyProject
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: project.fields["ek_modus"]?.text == "wohnung" ? "building" : "house").font(.title2).foregroundStyle(.teal).frame(width: 42, height: 48)
            VStack(alignment: .leading, spacing: 4) {
                Text(project.name).font(.headline).foregroundStyle(.primary)
                Text(project.address.nonempty ?? "Anschrift ergänzen").font(.subheadline).foregroundStyle(.secondary)
                Text(project.updated, style: .date).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }.padding(.vertical, 8)
    }
}
struct SharedActivity: UIViewControllerRepresentable {
    var url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: [url], applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
