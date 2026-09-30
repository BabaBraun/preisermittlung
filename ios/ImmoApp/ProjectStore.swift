import Foundation
import Observation

@MainActor @Observable final class ProjectStore {
    private(set) var archive = NativeArchive()
    let schema: FormSchema
    let engine: CalculationEngine
    var errorMessage: String?
    private let file: URL
    init(directory: URL? = nil, bundle: Bundle = .main) throws {
        engine = try CalculationEngine(bundle: bundle)
        guard let schemaURL = bundle.url(forResource: "formular", withExtension: "json") else { throw NativeError.message("Formularschema fehlt.") }
        schema = try JSONDecoder().decode(FormSchema.self, from: Data(contentsOf: schemaURL))
        let directory = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("ImmoAppNative", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        file = directory.appendingPathComponent("bewertungen.json")
        if FileManager.default.fileExists(atPath: file.path) { archive = try JSONDecoder().decode(NativeArchive.self, from: Data(contentsOf: file)) }
    }
    var projects: [PropertyProject] { archive.projects.sorted { $0.updated > $1.updated } }
    func project(_ id: UUID) -> PropertyProject? { archive.projects.first { $0.id == id } }
    @discardableResult func create() throws -> UUID {
        var fields = schema.defaults
        fields["ek_stichtag"] = .string(Date().formatted(.iso8601.year().month().day().dateSeparator(.dash)))
        let project = PropertyProject(name: "Neue Immobilie", fields: fields)
        var next = archive; next.projects.append(project); try commit(next)
        return project.id
    }
    func update(_ id: UUID, field: String, value: JSONValue) {
        var next = archive
        guard let i = next.projects.firstIndex(where: { $0.id == id }) else { return }
        next.projects[i].fields[field] = value
        if field == "pj_name" { next.projects[i].name = value.text.isEmpty ? "Neue Immobilie" : value.text }
        if field == "ek_typ", let type = schema.types[value.text]?.object {
            let base = type["nhk"]?.array.map(\.text).joined(separator: ", ") ?? ""
            next.projects[i].fields["nhkhg_base"] = .string(base)
            next.projects[i].fields["nhkhg_gnd"] = type["gnd"]
        }
        if field == "bw_nutzart" { next.projects[i].fields["bw_nutzung"] = .string(value.text == "wohnen" ? "wohnen" : "gewerbe"); next.projects[i].fields["bw_nachweise_geprueft"] = .bool(false) }
        if field == "bw_nutzung" { next.projects[i].fields["bw_nutzart"] = .string(value.text == "wohnen" ? "wohnen" : "buero"); next.projects[i].fields["bw_nachweise_geprueft"] = .bool(false) }
        next.projects[i].updated = Date()
        do { try commit(next) } catch { errorMessage = error.localizedDescription }
    }
    func duplicate(_ id: UUID) throws {
        guard var p = project(id) else { return }
        p.id = UUID(); p.name += " – Kopie"; p.fields["pj_name"] = .string(p.name); p.updated = Date()
        var next = archive; next.projects.append(p); try commit(next)
    }
    func remove(_ id: UUID) throws { var next = archive; next.projects.removeAll { $0.id == id }; try commit(next) }
    func addPhoto(_ id: UUID, data: Data) throws {
        var next = archive; guard let i = next.projects.firstIndex(where: { $0.id == id }) else { return }
        var photos = next.projects[i].attachments["photos"]?.array ?? []
        photos.append(.object(["data":.string("data:image/jpeg;base64," + data.base64EncodedString()),"id":.string(UUID().uuidString),"caption":.string("Objektfoto"),"cat":.string("objekt")]))
        next.projects[i].attachments["photos"] = .array(photos); next.projects[i].updated = Date(); try commit(next)
    }
    func importData(_ data: Data) throws {
        guard data.count <= 100_000_000 else { throw NativeError.message("Datei ist größer als 100 MB.") }
        if let own = try? JSONDecoder().decode(NativeArchive.self, from: data), own.version == 1, !own.projects.isEmpty {
            var next = archive; for var p in own.projects { p.id = UUID(); next.projects.append(p) }; next.legacyMetadata.merge(own.legacyMetadata) { old,_ in old }; try commit(next); return
        }
        let raw = try JSONSerialization.jsonObject(with: data)
        let validated = try engine.validateImport(raw)
        var next = archive
        if let projects = validated["projekte"] as? [[String: Any]] {
            for p in projects { next.projects.append(try importedProject(p["data"] as? [String: Any] ?? [:], name: p["name"] as? String)) }
            for key in ["kunden","aufgaben","parameter"] { if let v = validated[key] { next.legacyMetadata[key] = try convert(v) } }
        } else if let snapshot = validated["daten"] as? [String: Any] { next.projects.append(try importedProject(snapshot, name: nil)) }
        guard next.projects.count > archive.projects.count else { throw NativeError.message("Die Datei enthält keine importierbaren Bewertungen.") }
        try commit(next)
    }
    private func importedProject(_ raw: [String: Any], name: String?) throws -> PropertyProject {
        var payload = try convert(raw).object
        var fields = schema.defaults
        fields.merge(payload.removeValue(forKey: "fields")?.object ?? [:]) { _,new in new }
        return PropertyProject(name: name ?? fields["pj_name"]?.text.nonempty ?? "Importierte Immobilie", fields: fields, attachments: payload)
    }
    private func convert(_ value: Any) throws -> JSONValue { try JSONDecoder().decode(JSONValue.self, from: JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])) }
    func exportProject(_ id: UUID) throws -> URL {
        guard let p = project(id) else { throw NativeError.message("Bewertung nicht gefunden.") }
        return try export(p.snapshot, name: "ImmoApp-Bewertung-\(p.id.uuidString).json")
    }
    func exportBackup() throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ImmoApp-Sicherung.json")
        try JSONEncoder().encode(archive).write(to: url, options: .atomic); return url
    }
    private func export<T: Encodable>(_ value: T, name: String) throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(value).write(to: url, options: .atomic); return url
    }
    func addTestProperties(bundle: Bundle = .main) throws -> Int {
        guard let url = bundle.url(forResource: "testimmobilien", withExtension: "json") else { throw NativeError.message("Testimmobilien fehlen.") }
        let testArchive = try JSONDecoder().decode(NativeArchive.self, from: Data(contentsOf: url))
        guard testArchive.version == 1, testArchive.projects.count == 6,
              testArchive.projects.allSatisfy({ $0.name.hasPrefix("TEST – ") && $0.fields["native_testdata"] == .bool(true) }) else {
            throw NativeError.message("Unzulässiger Testdatensatz.")
        }
        var next = archive; var added = 0
        for project in testArchive.projects {
            if next.projects.contains(where: { $0.name == project.name && $0.fields["native_testdata"] == .bool(true) }) { continue }
            _ = try engine.calculate(project.rawFields)
            next.projects.append(project); added += 1
        }
        if added > 0 { try commit(next) }
        // Empfangsbestätigung enthält ausschließlich Angaben zu den öffentlichen Testfällen.
        let receipt: [String: Any] = ["version":1,"added":added,"testNames":testArchive.projects.map(\.name)]
        try JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted]).write(to:file.deletingLastPathComponent().appendingPathComponent("testimmobilien-status.json"),options:.atomic)
        return added
    }
    func diagnoseTestPrices(bundle: Bundle = .main) throws {
        guard let url = bundle.url(forResource:"testimmobilien",withExtension:"json") else { throw NativeError.message("Testdaten fehlen.") }
        let canonical = try JSONDecoder().decode(NativeArchive.self,from:Data(contentsOf:url))
        var reports: [[String:Any]] = []
        for sample in canonical.projects {
            let expected = try engine.calculate(sample.rawFields)
            let current = archive.projects.first { $0.name == sample.name && $0.fields["native_testdata"] == .bool(true) }
            var report: [String:Any] = ["name":sample.name,"canonicalPrice":expected.number("empfehlung"),"canonicalDisplay":money(expected.number("empfehlung")),"found":current != nil]
            if let current {
                let actual = try engine.calculate(current.rawFields)
                let different = sample.fields.keys.filter { current.fields[$0] != sample.fields[$0] }.sorted()
                report["differentFieldNames"] = different
                report["storedPricePositive"] = actual.number("empfehlung") > 0
                report["storedPriceStatus"] = actual.price.status
                report["storedResultHasNumericPrice"] = actual.values["empfehlung"] is NSNumber
                report["storedGroundPositive"] = actual.number("bodenwert") > 0
                report["storedIncomePositive"] = actual.number("ertrag") > 0
                report["storedSubstancePositive"] = actual.number("substanz") > 0
            }
            reports.append(report)
        }
        // Keine gespeicherten Feldwerte oder Preise exportieren. Beträge oben stammen nur aus dem öffentlichen Beispieldatensatz.
        try JSONSerialization.data(withJSONObject:["version":1,"reports":reports],options:[.prettyPrinted]).write(to:file.deletingLastPathComponent().appendingPathComponent("testpreis-diagnose.json"),options:.atomic)
    }
    private func commit(_ next: NativeArchive) throws {
        try JSONEncoder().encode(next).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        archive = next
    }
}
extension String { var nonempty: String? { trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self } }
