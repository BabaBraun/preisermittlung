import XCTest
@testable import ImmoApp

@MainActor final class EditorTests: XCTestCase {
    func testTestPropertiesAreAddedOnceWithoutChangingExistingProject() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = try ProjectStore(directory:directory)
        let id = try store.create(); store.update(id,field:"pj_name",value:.string("Bestehendes Objekt"))
        store.update(id,field:"ek_wohnflaeche",value:.string("123,5"))
        let original = try XCTUnwrap(store.project(id))
        XCTAssertEqual(try store.addTestProperties(),6)
        XCTAssertEqual(store.projects.count,7)
        XCTAssertEqual(store.project(id)?.fields,original.fields)
        XCTAssertEqual(store.project(id)?.attachments,original.attachments)
        XCTAssertEqual(try store.addTestProperties(),0)
        let reopened = try ProjectStore(directory:directory)
        XCTAssertEqual(reopened.projects.count,7)
        XCTAssertEqual(reopened.project(id)?.fields["ek_wohnflaeche"]?.text,"123,5")
    }
    func testCoreFlowHasShortStepsAndApartmentOmitsHouseOnlyQuestions() throws {
        let store = try ProjectStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let house = EditorPlan.primary(schema: store.schema, values: store.schema.defaults)
        XCTAssertTrue(house.allSatisfy { !$0.fields.isEmpty && $0.fields.count <= 5 })
        var apartment = store.schema.defaults; apartment["ek_modus"] = .string("wohnung")
        let steps = EditorPlan.primary(schema: store.schema, values: apartment)
        XCTAssertFalse(steps.flatMap(\.fields).contains { $0.id == "ek_gs_flaeche" || $0.id.hasPrefix("bgfhg_") || $0.id == "bpi" })
        XCTAssertTrue(steps.flatMap(\.fields).contains { $0.id == "vw_preis" })
    }
    func testOptionalModuleStartsWithOnlyActivationAndPreservesExistingData() throws {
        let store = try ProjectStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let group = try XCTUnwrap(store.schema.groups.first { $0.id == "s-pv" })
        var values = store.schema.defaults; values["pv_aktiv"] = .bool(false); values["pv_kwp"] = .string("9")
        let inactive = EditorPlan.group(group, values: values)
        XCTAssertEqual(inactive.flatMap(\.fields).map(\.id), ["pv_aktiv"])
        values["pv_aktiv"] = .bool(true)
        let active = EditorPlan.group(group, values: values)
        XCTAssertTrue(active.flatMap(\.fields).contains { $0.id == "pv_kwp" })
        XCTAssertTrue(active.allSatisfy { $0.fields.count <= 4 })
        XCTAssertEqual(values["pv_kwp"]?.text,"9")
    }
    func testRepeatedRowsHideUnusedItemsAndRetainImportedRows() throws {
        let store = try ProjectStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let group = try XCTUnwrap(store.schema.groups.first { $0.id == "s-aufnahme" })
        var values = store.schema.defaults; values["rl_aktiv"] = .bool(true)
        XCTAssertFalse(EditorPlan.group(group,values:values).flatMap(\.fields).contains { $0.id == "rl_name9" })
        values["rl_name9"] = .string("Importierter Raum")
        XCTAssertTrue(EditorPlan.group(group,values:values).flatMap(\.fields).contains { $0.id == "rl_name9" })
        XCTAssertEqual(EditorPlan.repeated("mr_pm210")?.index,10)
    }
    func testNumericMetadataAndValidationUseActualFieldKinds() throws {
        let store = try ProjectStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let fields = store.schema.groups.flatMap(\.fields)
        func kind(_ id: String) throws -> InputKind { InputPolicy.kind(for: try XCTUnwrap(fields.first { $0.id == id })) }
        XCTAssertEqual(try kind("ek_baujahr"),.integer)
        XCTAssertEqual(try kind("ek_anz_we"),.integer)
        XCTAssertEqual(try kind("ek_wohnflaeche"),.decimal)
        XCTAssertEqual(try kind("er_zins_basis"),.decimal)
        XCTAssertEqual(try kind("pq_lz_quelle"),.text)
        XCTAssertEqual(try kind("nhkhg_base"),.text)
        XCTAssertFalse(InputPolicy.accepts("1985abc",kind:.integer))
        XCTAssertFalse(InputPolicy.accepts("3,5",kind:.integer))
        XCTAssertFalse(InputPolicy.accepts("1,2,3",kind:.decimal))
        XCTAssertTrue(InputPolicy.accepts("145,5",kind:.decimal))
        XCTAssertTrue(InputPolicy.accepts("-5000",kind:.signedDecimal))
        XCTAssertEqual(InputPolicy.editingText("1.406",kind:.decimal),"1.406")
        XCTAssertEqual(InputPolicy.editingText("267.901",kind:.decimal,groupedAmount:true),"267901")
    }
}
