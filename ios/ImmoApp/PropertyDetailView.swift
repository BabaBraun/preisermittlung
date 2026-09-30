import SwiftUI
import PhotosUI

struct PropertyDetailView: View {
    @Bindable var store: ProjectStore
    var projectID: UUID
    @State private var share: SharedFile?
    @State private var selectedPhoto: PhotosPickerItem?
    var body: some View {
        if let project = store.project(projectID) {
            List {
                Section {
                    TextField("Objektname", text: fieldBinding("pj_name")).font(.title2.bold()).accessibilityIdentifier("propertyName")
                    Text(project.address.nonempty ?? "Anschrift in den Eckdaten ergänzen").foregroundStyle(.secondary)
                    if let calculation = try? store.engine.calculate(project.rawFields) {
                        let price = PricePresentation(calculation)
                        VStack(alignment:.leading,spacing:6) {
                            Text(price.label).font(.subheadline).foregroundStyle(.secondary)
                            Text(price.headline).font(.title2.bold()).foregroundStyle(price.available ? .primary : .secondary).accessibilityIdentifier("objectPrice")
                        }.padding(.vertical,8)
                    }
                    NavigationLink { ResultView(store: store, projectID: projectID) } label: { Label("Preisempfehlung und Rechenweg", systemImage: "chart.bar.xaxis") }.accessibilityIdentifier("openResults")
                }
                Section {
                    NavigationLink { GuidedEditor(store: store, projectID: projectID) } label: {
                        Label("Bewertung Schritt für Schritt", systemImage: "arrow.right.circle.fill").font(.headline)
                    }.accessibilityIdentifier("startWizard")
                    Text("Objekt, Flächen, Miete und Bewertungsgrundlagen in kurzen Eingabeschritten erfassen.").font(.footnote).foregroundStyle(.secondary)
                }
                Section("Weitere Angaben") {
                    NavigationLink { AdditionalSectionsView(store: store, projectID: projectID) } label: { Label("Besichtigung, Details und Sonderfälle", systemImage: "slider.horizontal.3") }
                }
                Section("Fotos") {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) { Label("Objektfoto hinzufügen", systemImage: "photo.badge.plus") }
                    let photos = project.attachments["photos"]?.array ?? []
                    ForEach(Array(photos.prefix(3).enumerated()), id: \.offset) { _, photo in
                        if let encoded = photo.object["data"]?.text.split(separator: ",", maxSplits: 1).last, let data = Data(base64Encoded: String(encoded)), let image = UIImage(data: data) {
                            Image(uiImage: image).resizable().scaledToFit().frame(maxHeight: 110).accessibilityLabel("Objektfoto")
                        }
                    }
                }
                Section {
                    Button("Bewertung als Datei teilen", systemImage: "square.and.arrow.up") { do { share = SharedFile(url: try store.exportProject(projectID)) } catch { store.errorMessage = error.localizedDescription } }
                    Button("PDF-Bericht teilen", systemImage: "doc.richtext") { do { share = SharedFile(url: try NativeReport.export(project: project, engine: store.engine, schema: store.schema)) } catch { store.errorMessage = error.localizedDescription } }
                }
            }
            .navigationTitle(project.name).navigationBarTitleDisplayMode(.inline)
            .sheet(item: $share) { SharedActivity(url: $0.url) }
            .onChange(of: selectedPhoto) { _, item in
                Task {
                    do {
                        guard let data = try await item?.loadTransferable(type: Data.self), let image = UIImage(data: data) else { throw NativeError.message("Das Foto konnte nicht geladen werden.") }
                        let size = image.size, scale = min(1, 1600 / max(size.width, size.height))
                        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size.width * scale, height: size.height * scale))
                        let smaller = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: CGSize(width: size.width * scale, height: size.height * scale))) }
                        guard let jpeg = smaller.jpegData(compressionQuality: 0.8) else { throw NativeError.message("Foto konnte nicht gespeichert werden.") }
                        try store.addPhoto(projectID, data: jpeg)
                    } catch { store.errorMessage = error.localizedDescription }
                }
            }
        } else { ContentUnavailableView("Objekt nicht vorhanden", systemImage: "house") }
    }
    private func fieldBinding(_ id: String) -> Binding<String> { Binding(get: { store.project(projectID)?.fields[id]?.text ?? "" }, set: { store.update(projectID, field: id, value: .string($0)) }) }
}
