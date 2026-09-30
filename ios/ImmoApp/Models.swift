import Foundation

enum JSONValue: Codable, Equatable {
    case string(String), number(Double), bool(Bool), object([String: JSONValue]), array([JSONValue]), null
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([String: JSONValue].self) { self = .object(v) }
        else { self = .array(try c.decode([JSONValue].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }
    var raw: Any {
        switch self {
        case .string(let v): return v
        case .number(let v): return v
        case .bool(let v): return v
        case .object(let v): return v.mapValues(\.raw)
        case .array(let v): return v.map(\.raw)
        case .null: return NSNull()
        }
    }
    var text: String {
        switch self { case .string(let v): return v; case .number(let v): return String(v); case .bool(let v): return v ? "true" : "false"; default: return "" }
    }
    var object: [String: JSONValue] { if case .object(let v) = self { return v }; return [:] }
    var array: [JSONValue] { if case .array(let v) = self { return v }; return [] }
}
struct FieldOption: Decodable, Identifiable { var value: String; var label: String; var id: String { value } }
struct FormField: Decodable, Identifiable { var id: String; var label: String; var type: String; var value: String; var options: [FieldOption]; var section: String?; var inputKind: InputKind?; var unit: String? }
struct FormGroup: Decodable, Identifiable { var id: String; var title: String; var fields: [FormField] }
struct FormSchema: Decodable { var defaults: [String: JSONValue]; var groups: [FormGroup]; var types: [String: JSONValue] }
struct PropertyProject: Codable, Identifiable {
    var id: UUID = UUID()
    var name: String
    var fields: [String: JSONValue]
    var attachments: [String: JSONValue] = [:]
    var updated: Date = Date()
    var rawFields: [String: Any] { fields.mapValues(\.raw) }
    var snapshot: [String: JSONValue] { var raw = attachments; raw["fields"] = .object(fields); return raw }
    var address: String { fields["ek_anschrift"]?.text ?? "" }
}
struct NativeArchive: Codable {
    var version: Int = 1
    var projects: [PropertyProject] = []
    // Altdaten außerhalb der Bewertungen werden beim Import erhalten.
    var legacyMetadata: [String: JSONValue] = [:]
}
