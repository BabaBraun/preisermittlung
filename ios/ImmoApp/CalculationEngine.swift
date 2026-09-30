import Foundation
import JavaScriptCore

struct CheckIssue: Decodable, Identifiable {
    var feld: String
    var text: String
    var id: String { feld + text }
}
struct ModelCheck: Decodable {
    var status: String
    var fehlend: [CheckIssue]
    var hinweise: [CheckIssue]
    var issues: [CheckIssue] { fehlend + hinweise }
}
struct Calculation {
    var values: [String: Any]
    var details: [String: Any]
    var price: ModelCheck
    var lending: ModelCheck
    func number(_ key: String) -> Double { (values[key] as? NSNumber)?.doubleValue ?? 0 }
}

// Keine WebView: reiner, lokaler Formelkern in Apples JavaScriptCore.
final class CalculationEngine {
    private let context: JSContext
    private var scriptError: String?
    init(bundle: Bundle = .main) throws {
        guard let context = JSContext() else { throw NativeError.message("Rechenkern konnte nicht starten.") }
        self.context = context
        context.exceptionHandler = { [weak self] _, value in self?.scriptError = value?.toString() }
        for name in ["modell", "kern", "daten", "native-numbers", "native-adapter"] {
            guard let url = bundle.url(forResource: name, withExtension: "js") else { throw NativeError.message("Lokaler Rechenbaustein fehlt: \(name)") }
            context.evaluateScript(try String(contentsOf: url, encoding: .utf8), withSourceURL: url)
        }
        if let scriptError { throw NativeError.message(scriptError) }
    }
    private func call(_ function: String, _ args: [Any]) throws -> Any {
        scriptError = nil
        guard let value = context.objectForKeyedSubscript(function)?.call(withArguments: args), !value.isUndefined else {
            throw NativeError.message(scriptError ?? "Berechnung fehlgeschlagen.")
        }
        if let scriptError { throw NativeError.message(scriptError) }
        guard let object = value.toObject() else { throw NativeError.message("Keine Rechenergebnisse verfügbar.") }
        return object
    }
    func calculate(_ fields: [String: Any], year: Int = Calendar.current.component(.year, from: Date())) throws -> Calculation {
        guard let raw = try call("nativeCalculate", [fields, year]) as? [String: Any], let r = raw["R"] as? [String: Any], let d = raw["D"] as? [String: Any] else { throw NativeError.message("Unvollständiges Rechenergebnis.") }
        guard let price = r["empfehlung"] as? NSNumber, price.doubleValue.isFinite else {
            throw NativeError.message("Der Rechenkern liefert keinen gültigen Preis. Bitte prüfe die Eingaben; ein fehlendes Ergebnis wird nicht als 0 Euro ausgegeben.")
        }
        func check(_ key: String) throws -> ModelCheck {
            try JSONDecoder().decode(ModelCheck.self, from: JSONSerialization.data(withJSONObject: raw[key] ?? [:]))
        }
        return try Calculation(values: r, details: d, price: check("price"), lending: check("lending"))
    }
    func validateImport(_ raw: Any) throws -> [String: Any] {
        guard let result = try call("nativeImport", [raw]) as? [String: Any], result["ok"] as? Bool == true else {
            throw NativeError.message("Die Datei enthält keine gültige Immobilienbewertung oder Projektsicherung.")
        }
        return result
    }
}

enum NativeError: LocalizedError {
    case message(String)
    var errorDescription: String? { switch self { case .message(let text): return text } }
}
