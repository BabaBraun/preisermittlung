import SwiftUI

struct AdditionalSectionsView: View {
    @Bindable var store: ProjectStore
    var projectID: UUID
    private let categories: [(String,[String])] = [
        ("Objekt und Besichtigung",["s-eck","s-aufnahme","s-technik","s-hg","s-anbau"]),
        ("Bewertungsdetails",["s-grundlagen","s-substanz","s-vergleich","s-ertrag","s-empfehlung"]),
        ("Optionale Module",["s-niess","s-erbbau","s-wk","s-pv","s-energie","s-belwert"]),
        ("Bericht",["s-sign","s-rendite","s-expose","s-vermarktung"])
    ]
    var body: some View {
        List {
            ForEach(categories, id: \.0) { title, ids in
                Section(title) {
                    ForEach(store.schema.groups.filter { ids.contains($0.id) && (store.project(projectID)?.fields["ek_modus"]?.text != "wohnung" || !["s-hg","s-anbau","s-substanz","s-erbbau"].contains($0.id)) }) { group in
                        NavigationLink(group.id == "s-empfehlung" ? "Gewichtung und Preisspanne" : group.title) { GroupEditor(store: store, projectID: projectID, group: group) }
                    }
                }
            }
        }.navigationTitle("Weitere Angaben").navigationBarTitleDisplayMode(.inline)
    }
}
struct GroupEditor: View {
    @Bindable var store: ProjectStore
    var projectID: UUID
    var group: FormGroup
    var initialFieldID: String? = nil
    var body: some View { GuidedEditor(store: store, projectID: projectID, group: group, initialFieldID: initialFieldID) }
}
struct GuidedEditor: View {
    @Bindable var store: ProjectStore
    var projectID: UUID
    var group: FormGroup? = nil
    var initialFieldID: String? = nil
    @State private var pageIndex = 0
    @State private var extraRows: [String:Int] = [:]
    @State private var prepared = false
    @State private var showResult = false
    @State private var focusedID: String?
    @FocusState private var textFocus: String?
    private var values: [String:JSONValue] { store.project(projectID)?.fields ?? [:] }
    private var steps: [EditorStep] {
        if let group { return EditorPlan.group(group, values: values, extraRows: extraRows, target: initialFieldID) }
        return EditorPlan.primary(schema: store.schema, values: values)
    }
    private var index: Int { min(max(pageIndex,0),max(steps.count - 1,0)) }
    private var step: EditorStep? { steps.indices.contains(index) ? steps[index] : nil }
    private var progressKey: String { "native.editor.\(projectID).\(group?.id ?? "primary")" }
    private var textFields: [FormField] { step?.fields.filter { ["text","note"].contains($0.type) } ?? [] }
    var body: some View {
        VStack(spacing: 0) {
            if let step {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Schritt \(index + 1) von \(steps.count)").font(.subheadline.weight(.semibold)).foregroundStyle(.teal).accessibilityIdentifier("stepCounter")
                        Spacer()
                        Menu {
                            ForEach(Array(steps.enumerated()), id: \.element.id) { i,s in Button("\(i + 1). \(s.title)") { navigate(i) } }
                        } label: { Image(systemName: "list.bullet").accessibilityLabel("Schritt auswählen") }
                    }
                    ProgressView(value: Double(index + 1), total: Double(max(steps.count,1)))
                    Text(step.title).font(.title2.bold()).accessibilityIdentifier("stepTitle")
                    if focusedID == nil {
                        Text(step.hint).font(.subheadline).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                }.padding().background(Color(.systemGroupedBackground))
                Form {
                    Section {
                        ForEach(step.fields) { field in
                            NativeFieldRow(field: field, value: Binding(get: { values[field.id] ?? .string(field.value) }, set: { store.update(projectID, field: field.id, value: $0) }), focusedID: $focusedID, textFocus: $textFocus, onPrevious: { focus(-1) }, onNext: { focus(1) }, onDone: { focusedID = nil; dismissKeyboard() })
                        }
                    }
                    if let family = step.fields.last.flatMap({ EditorPlan.repeated($0.id)?.family }), let group {
                        let currentMax = steps.flatMap(\.fields).compactMap { EditorPlan.repeated($0.id) }.filter { $0.family == family }.map(\.index).max() ?? 0
                        let limit = group.fields.compactMap { EditorPlan.repeated($0.id) }.filter { $0.family == family }.map(\.index).max() ?? 0
                        if currentMax < limit {
                            Section { Button("\(EditorPlan.familyTitle(family)) hinzufügen", systemImage: "plus.circle") { extraRows[family] = currentMax + 1 } }
                        }
                    }
                    if let group, step.fields.count == 1, EditorPlan.activations[group.id] == step.fields[0].id, values[step.fields[0].id]?.text != "true" {
                        Section { Text("Aktiviere dieses Modul, wenn es für dein Objekt relevant ist. Bereits erfasste Angaben bleiben erhalten.").font(.footnote).foregroundStyle(.secondary) }
                    }
                }.id(step.id).scrollDismissesKeyboard(.interactively)
            }
        }
        .navigationTitle(group?.id == "s-empfehlung" ? "Gewichtung und Preisspanne" : (group?.title ?? "Bewertung erfassen")).navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 8) {
                HStack(spacing: 16) {
                    Button { navigate(index - 1) } label: { Label("Zurück", systemImage: "chevron.left") }.disabled(index == 0).accessibilityIdentifier("stepBack")
                    Spacer()
                    Button {
                        if index + 1 < steps.count { navigate(index + 1) } else { focusedID = nil; showResult = true }
                    } label: { HStack { Text(index + 1 < steps.count ? "Weiter" : "Ergebnis ansehen"); Image(systemName: "chevron.right") }.frame(minWidth: 140).padding(.vertical, 5) }
                    .buttonStyle(.borderedProminent).accessibilityIdentifier("stepNext")
                }
                Text("Automatisch gespeichert · Fehlende Grundlagen bleiben als Entwurf sichtbar").font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }.padding(.horizontal).padding(.vertical,12).background(.regularMaterial)
        }
        .toolbar {
            if textFocus != nil {
            ToolbarItemGroup(placement: .keyboard) {
                Button("Vorheriges Feld", systemImage: "chevron.up") { focus(-1) }.labelStyle(.iconOnly)
                Button("Nächstes Feld", systemImage: "chevron.down") { focus(1) }.labelStyle(.iconOnly).accessibilityIdentifier("nextInput")
                if let id = focusedID, let field = textFields.first(where: { $0.id == id }), InputPolicy.kind(for: field) == .signedDecimal {
                    Button("±") {
                        let text = values[id]?.text ?? ""
                        store.update(projectID, field: id, value: .string(text.hasPrefix("-") || text.hasPrefix("−") ? String(text.dropFirst()) : "-" + text))
                        // UIKit-Feld beim Vorzeichenwechsel neu synchronisieren.
                        focusedID = nil; DispatchQueue.main.async { focusedID = id }
                    }.accessibilityLabel("Vorzeichen wechseln")
                }
                Spacer()
                Button("Fertig") { focusedID = nil; dismissKeyboard() }
            }
            }
        }
        .navigationDestination(isPresented: $showResult) { ResultView(store: store, projectID: projectID) }
        .onAppear {
            guard !prepared else { return }; prepared = true
            if let target = initialFieldID, let i = steps.firstIndex(where: { $0.fields.contains { $0.id == target } }) { pageIndex = i }
            else { pageIndex = min(UserDefaults.standard.integer(forKey: progressKey),max(steps.count - 1,0)) }
        }
        .onChange(of: textFocus) { _, value in if let value { focusedID = value } }
        .onChange(of: steps.count) { _,_ in pageIndex = index }
    }
    private func navigate(_ next: Int) { focusedID = nil; dismissKeyboard(); pageIndex = min(max(next,0),max(steps.count - 1,0)); UserDefaults.standard.set(pageIndex,forKey:progressKey) }
    private func focus(_ direction: Int) {
        let current = textFields.firstIndex { $0.id == focusedID } ?? -1
        let next = current + direction
        if textFields.indices.contains(next) {
            let field = textFields[next]; focusedID = field.id
            textFocus = InputPolicy.kind(for: field) == .text ? field.id : nil
        }
        else if direction > 0 && index + 1 < steps.count { navigate(index + 1) }
        else { focusedID = nil; dismissKeyboard() }
    }
    private func dismissKeyboard() { textFocus = nil; UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),to:nil,from:nil,for:nil) }
}
struct NativeFieldRow: View {
    var field: FormField
    @Binding var value: JSONValue
    var focusedID: Binding<String?>
    var textFocus: FocusState<String?>.Binding
    var onPrevious: () -> Void
    var onNext: () -> Void
    var onDone: () -> Void
    @State private var inputError: String?
    private var text: Binding<String> { Binding(get: { value.text }, set: { value = .string($0) }) }
    var body: some View {
        Group {
            switch field.type {
            case "toggle": Toggle(field.label, isOn: Binding(get: { value.text == "true" }, set: { value = .bool($0) }))
            case "choice":
                Picker(field.label, selection: text) {
                    if !field.options.contains(where: { $0.value == value.text }) { Text(value.text.isEmpty ? "Bitte wählen" : value.text).tag(value.text) }
                    ForEach(field.options) { Text($0.label).tag($0.value) }
                }.pickerStyle(.menu)
            case "date":
                if value.text.isEmpty {
                    Button { value = .string(Date().formatted(.iso8601.year().month().day().dateSeparator(.dash))) } label: { LabeledContent(field.label, value:"Datum festlegen") }
                } else {
                    DatePicker(field.label, selection: Binding(get: { ISO8601DateFormatter().date(from: value.text + "T12:00:00Z") ?? Date() }, set: { value = .string($0.formatted(.iso8601.year().month().day().dateSeparator(.dash))) }), displayedComponents: .date)
                }
            default:
                VStack(alignment:.leading,spacing:10) {
                    Text(field.label).font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
                    if InputPolicy.kind(for: field) != .text {
                        HStack(alignment:.firstTextBaseline) {
                            NumberInput(value:$value,field:field,focusedID:focusedID,error:$inputError,onPrevious:onPrevious,onNext:onNext,onDone:onDone).frame(height:44)
                            if let unit = field.unit { Text(unit).foregroundStyle(.secondary).font(.subheadline) }
                        }
                    } else {
                        TextField(field.type == "note" ? "Notiz eingeben" : "Eintragen", text:text, axis:field.type == "note" || field.id.contains("quelle") || field.id.contains("begruendung") ? .vertical : .horizontal)
                            .lineLimit(1...4).focused(textFocus,equals:field.id).submitLabel(.next).onSubmit { onNext() }
                    }
                    if let inputError { Text(inputError).font(.caption).foregroundStyle(.red).accessibilityIdentifier("numericInputError") }
                }.padding(.vertical,6)
            }
        }.accessibilityIdentifier(field.id)
    }
}
