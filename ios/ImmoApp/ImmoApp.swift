import SwiftUI

@main struct ImmoApp: App {
    private let startup: Result<ProjectStore, Error>
    init() {
        startup = Result {
            let store = try ProjectStore()
            if ProcessInfo.processInfo.arguments.contains("--testimmobilien-einspielen") {
                do { _ = try store.addTestProperties() }
                catch { store.errorMessage = error.localizedDescription }
            }
            if ProcessInfo.processInfo.arguments.contains("--testpreise-diagnose") {
                do { try store.diagnoseTestPrices() }
                catch { store.errorMessage = error.localizedDescription }
            }
            return store
        }
    }
    var body: some Scene {
        WindowGroup {
            switch startup {
            case .success(let store): NativeRootView(store: store).environment(\.locale, Locale(identifier: "de_DE"))
            case .failure(let error): ContentUnavailableView("Bewertungen konnten nicht geöffnet werden", systemImage: "externaldrive.badge.exclamationmark", description: Text(error.localizedDescription + " Deine gespeicherte Datei wurde nicht überschrieben."))
            }
        }
    }
}
