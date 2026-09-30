import XCTest
import PDFKit
@testable import ImmoApp

@MainActor final class NativeTests: XCTestCase {
    func testIncompletePropertyNeverPresentsZeroAsPriceRecommendation() throws {
        let store = try ProjectStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let id = try store.create()
        let calculation = try store.engine.calculate(XCTUnwrap(store.project(id)).rawFields)
        let presentation = PricePresentation(calculation)
        XCTAssertFalse(presentation.available)
        XCTAssertEqual(presentation.headline,"Noch nicht berechenbar")
        XCTAssertFalse(presentation.headline.contains("0,00"))
    }
    func testSeededProjectsHaveRealCalculatedPricesAfterSaveAndReload() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:directory) }
        let store = try ProjectStore(directory:directory)
        XCTAssertEqual(try store.addTestProperties(),6)
        let reopened = try ProjectStore(directory:directory)
        let expected: [String: Double] = [
            "TEST – Einfamilienhaus mit PV":472970.43,
            "TEST – Vermietete Eigentumswohnung":238799,
            "TEST – Mehrfamilienhaus mit sechs Wohnungen":887783,
            "TEST – Sanierungsbedürftiges Altbauhaus":387855,
            "TEST – Wohnrecht und kurze Restnutzung":455321
        ]
        for project in reopened.projects {
            let calculation = try reopened.engine.calculate(project.rawFields,year:2026)
            if let price = expected[project.name] {
                XCTAssertGreaterThan(calculation.number("empfehlung"),100000,project.name)
                XCTAssertEqual(calculation.number("empfehlung"),price,accuracy:1,project.name)
            } else { XCTAssertNotEqual(calculation.price.status,"ok") }
        }
    }
    func testNativeRuntimeMatchesAllCharacterisedCases() throws {
        let engine = try CalculationEngine()
        let path = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "referenzfaelle", withExtension: "json"))
        let cases = try JSONSerialization.jsonObject(with: Data(contentsOf: path)) as! [[String: Any]]
        XCTAssertGreaterThanOrEqual(cases.count, 10)
        for item in cases {
            let result = try engine.calculate(item["fields"] as! [String: Any], year: 2026)
            for (key, expected) in item["numbers"] as! [String: NSNumber] {
                guard let actual = result.values[key] as? NSNumber else { continue }
                XCTAssertEqual(actual.doubleValue, expected.doubleValue, accuracy: 0.00001, "\(item["name"] ?? "Fall") / \(key)")
            }
        }
    }
    func testNativePDFHasMultiplePagesAndDraftWarnings() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = try ProjectStore(directory: directory); let id = try store.create()
        store.update(id, field: "pj_name", value: .string("PDF-Prüfung"))
        store.update(id, field: "ek_anschrift", value: .string(String(repeating: "Langer Text mit Umlauten äöü. ", count: 180)))
        let url = try NativeReport.export(project: XCTUnwrap(store.project(id)), engine: store.engine, schema: store.schema)
        let pdf = try XCTUnwrap(PDFDocument(url: url))
        XCTAssertGreaterThan(pdf.pageCount, 1)
        XCTAssertTrue(pdf.string?.contains("ENTWURF") == true)
        XCTAssertTrue(pdf.string?.contains("PDF-Prüfung") == true)
        XCTAssertTrue(pdf.string?.contains("Langer Text mit Umlauten") == true)
    }
    func testAppBundleContainsNoWebInterface() throws {
        let paths = try FileManager.default.contentsOfDirectory(at: Bundle.main.bundleURL, includingPropertiesForKeys: nil)
        XCTAssertFalse(paths.contains { ["html", "css"].contains($0.pathExtension) })
        XCTAssertFalse(paths.contains { $0.lastPathComponent == "capacitor.config.json" || $0.lastPathComponent == "public" })
    }
    func testKernelWithoutBrowserHasIndependentReferenceResults() throws {
        let engine = try CalculationEngine()
        let path = Bundle(for: Self.self).url(forResource: "fall_haus", withExtension: "json")!
        let f = try JSONSerialization.jsonObject(with: Data(contentsOf: path)) as! [String: Any]
        let result = try engine.calculate(f, year: 2026)
        XCTAssertEqual(result.number("beleihungswert"), 263323.44, accuracy: 0.01)
        XCTAssertEqual(result.price.status, "ok")
        var altered = f; altered["bw_bewirt"] = "0"; altered["bw_sicher"] = "0"
        let safe = try engine.calculate(altered, year: 2026)
        XCTAssertGreaterThanOrEqual(safe.number("bwBewirt"), safe.number("bwRoh") * 0.15)
        XCTAssertEqual(safe.number("bwSicherP"), 10)
        altered["pv_basis"] = "enthalten"; XCTAssertEqual(try engine.calculate(altered).number("pvWert"), 0)
    }
    func testSaveReloadAndInvalidImportPreserveExistingProjects() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = try ProjectStore(directory: directory)
        let id = try store.create(); store.update(id, field: "pj_name", value: .string("Prüfobjekt mit Umlauten"))
        XCTAssertThrowsError(try store.importData(Data("{kaputt".utf8)))
        let reopened = try ProjectStore(directory: directory)
        XCTAssertEqual(reopened.projects.count, 1); XCTAssertEqual(reopened.projects[0].name, "Prüfobjekt mit Umlauten")
        try reopened.importData(Data(contentsOf: reopened.exportProject(id)))
        XCTAssertEqual(reopened.projects.count, 2)
    }
    func testNativeBackupRoundtripPreservesPhotosAndUnknownFields() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = try ProjectStore(directory: directory); let id = try store.create()
        store.update(id, field: "zukuenftiges_feld", value: .string("Erhalten"))
        try store.addPhoto(id, data: Data([1,2,3]))
        let bytes = try Data(contentsOf: store.exportBackup()); try store.importData(bytes)
        XCTAssertEqual(store.projects.count, 2)
        XCTAssertEqual(store.projects[0].fields["zukuenftiges_feld"]?.text, "Erhalten")
        XCTAssertEqual(store.projects[0].attachments["photos"]?.array.count, 1)
    }
}
