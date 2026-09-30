import Foundation

// Explizite Feldarten statt Tastaturwahl anhand zufälliger Beschriftung.
enum InputKind: String, Decodable { case text, integer, decimal, signedDecimal }
struct InputPolicy {
    static func kind(for field: FormField) -> InputKind { field.inputKind ?? .text }
    static func accepts(_ text: String, kind: InputKind) -> Bool {
        if kind == .text { return true }
        if text.isEmpty { return true }
        let pattern: String
        switch kind {
        case .integer: pattern = "^[0-9]*$"
        case .decimal: pattern = "^[0-9]*(?:[,.][0-9]*)?$"
        case .signedDecimal: pattern = "^[−-]?[0-9]*(?:[,.][0-9]*)?$"
        case .text: return true
        }
        return text.range(of: pattern, options: .regularExpression) != nil
    }
    static func editingText(_ raw: String, kind: InputKind, groupedAmount: Bool = false) -> String {
        guard kind != .text else { return raw }
        // Nur eindeutig gruppierte Tausenderpunkte lösen; importierte Fehler sichtbar lassen.
        let clean = raw.replacingOccurrences(of: "−", with: "-").replacingOccurrences(of: " ", with: "")
        if clean.contains(",") { return clean.replacingOccurrences(of: ".", with: "") }
        if groupedAmount && clean.range(of: "^-?[1-9][0-9]{0,2}(?:\\.[0-9]{3})+$", options: .regularExpression) != nil {
            return clean.replacingOccurrences(of: ".", with: "")
        }
        return clean
    }
}
