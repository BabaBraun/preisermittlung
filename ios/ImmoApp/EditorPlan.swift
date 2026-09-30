import Foundation

struct EditorStep: Identifiable {
    var id: String
    var title: String
    var hint: String
    var fields: [FormField]
}
enum EditorPlan {
    static let labelOverrides: [String: String] = [
        "ek_modus":"Immobilienart", "ek_typ":"Gebäudetyp", "ek_wtyp":"Wohnungstyp",
        "ek_wohnflaeche":"Wohnfläche", "ek_nutzflaeche":"Weitere Nutzfläche", "ek_baujahr":"Baujahr",
        "ek_anz_we":"Wohneinheiten", "ek_anz_stell":"Stellplätze", "ek_brw":"Bodenrichtwert",
        "ek_miete_wohnen":"Jahresmiete Wohnen", "ek_miete_gewerbe":"Jahresmiete Gewerbe", "ek_miete_stellplatz":"Jahresmiete Stellplätze",
        "er_zins_basis":"Liegenschaftszins", "er_bewirt":"Bewirtschaftungskosten", "gewichtung":"Sachwertanteil (0 bis 1)",
        "gew_vergleich":"Vergleichswertanteil", "vw_preis":"Vergleichspreis je m²",
        "nhkhg_gnd":"Gesamtnutzungsdauer", "nhkhg_rnd":"Restnutzungsdauer (0 = berechnen)",
        "bpi":"Baupreisindex", "bpi_faktor":"Umrechnungsfaktor des Index", "markt_faktor":"Sachwertfaktor"
    ]
    static func field(_ field: FormField) -> FormField {
        var value = field
        if let label = labelOverrides[field.id] { value.label = label }
        return value
    }
    static func primary(schema: FormSchema, values: [String: JSONValue]) -> [EditorStep] {
        let all = Dictionary(schema.groups.flatMap(\.fields).map { ($0.id, field($0)) }, uniquingKeysWith: { a,_ in a })
        var steps: [EditorStep] = []
        func step(_ id: String, _ title: String, _ hint: String, _ ids: [String]) {
            let fields = ids.compactMap { all[$0] }
            if !fields.isEmpty { steps.append(EditorStep(id: id, title: title, hint: hint, fields: fields)) }
        }
        let apartment = values["ek_modus"]?.text == "wohnung"
        step("objekt", "Welche Immobilie?", "Die Immobilienart bestimmt, welche Angaben du anschließend brauchst.", ["ek_modus", apartment ? "ek_wtyp" : "ek_typ", "ek_anschrift", "ek_stichtag"])
        step("flaechen", "Flächen und Baujahr", "Trage die bekannten Flächen ein. Weitere Nutzfläche ist optional.", ["ek_wohnflaeche","ek_nutzflaeche","ek_baujahr"])
        step("einheiten", "Einheiten und Stellplätze", "Erfasse, wie viele Wohneinheiten und Stellplätze zur Immobilie gehören.", ["ek_anz_we","ek_anz_stell"])
        if !apartment {
            step("boden", "Grundstück", "Der Bodenwert ergibt sich aus Fläche und dem örtlichen Bodenrichtwert.", ["ek_gs_flaeche","ek_brw","ek_gs_abschlag","pq_brw_quelle"])
            for (i, name) in ["Untergeschoss", "Erdgeschoss", "Obergeschoss", "Dachgeschoss"].enumerated() {
                if i == 0 && values["hg_keller"]?.text == "nein" { continue }
                step("bgf\(i)", "Gebäudefläche: \(name)", "Länge × Breite plus zusätzliche Fläche. Ohne Abmessungen kannst du die gesamte Fläche im dritten Feld erfassen; Länge und Breite bleiben dann 0.", ["bgfhg_l\(i)","bgfhg_b\(i)","bgfhg_e\(i)"])
            }
            step("substanz", "Sachwert-Grundlagen", "Index und Faktoren müssen zum Stichtag und zum örtlichen Bewertungsmodell passen.", ["bpi","bpi_faktor","markt_faktor"])
            step("sachquellen", "Grundlagen des Sachwerts", "Dokumentiere Herkunft, Stichtag und Modellbezug des verwendeten Index und Faktors.", ["pq_bpi_quelle","pq_sf_quelle"])
        } else {
            step("vergleich", "Vergleichspreis", "Nutze nachvollziehbare vergleichbare Objekte und dokumentiere die Grundlage.", ["vw_preis","vw_garage","pq_vgl_quelle"])
        }
        step("miete", "Jährliche Mieterträge", "Alle Beträge in dieser Ansicht sind Jahresbeträge. Leerstand oder unbekannte Mieten bitte nicht durch Schätzwerte ersetzen.", ["ek_miete_wohnen","ek_miete_gewerbe","ek_miete_stellplatz","pq_miete_quelle"])
        step("ertrag", "Ertragswert-Grundlagen", "Lege die Zinssätze und Kosten anhand des verwendeten Marktmodells fest.", ["er_zins_basis","er_bewirt","pq_lz_quelle","pq_bw_quelle"])
        step("gewichtung", "Verfahren und Gewichtung", "Begründe, warum diese Verfahren und ihre Gewichtung für dein Objekt geeignet sind.", ["gewichtung","verhandlung","gewichtung_begruendung"])
        step("nachweise", "Grundlagen prüfen", "Unvollständige Angaben bleiben als Entwurf erkennbar. Zusätzliche Rechte, PV oder Beleihung kannst du im Objekt unter Weitere Angaben erfassen.", ["pq_modell_geprueft"])
        return steps
    }
    static let activations = ["s-anbau":"anbau_aktiv", "s-niess":"niess_aktiv", "s-erbbau":"eb_aktiv", "s-pv":"pv_aktiv", "s-energie":"en_aktiv", "s-belwert":"bw_aktiv"]
    static func group(_ group: FormGroup, values: [String: JSONValue], extraRows: [String: Int] = [:], target: String? = nil) -> [EditorStep] {
        var fields = group.fields.filter { $0.id != "ek_vordruck" }
        if let activation = activations[group.id], values[activation]?.text != "true" {
            fields = fields.filter { $0.id == activation }
        }
        fields = fields.filter { f in
            if let match = repeated(f.id) {
                if f.id == target { return true }
                if match.family == "rl" && values["rl_aktiv"]?.text != "true" { return false }
                if match.family == "mr" && values["er_mietrolle"]?.text != "true" { return false }
                let used = group.fields.filter { repeated($0.id)?.family == match.family }.compactMap { candidate -> Int? in
                    guard let entry = repeated(candidate.id) else { return nil }
                    let raw = values[candidate.id]?.text ?? ""
                    // Bereits ausgefüllte wiederholte Zeilen erhalten; Vorgabewerte allein erzeugen keine Zeilen.
                    return !raw.isEmpty && raw != "0" && raw != candidate.value ? entry.index : nil
                }.max() ?? 0
                return match.index <= max(used, extraRows[match.family] ?? 0)
            }
            if group.id == "s-eck" {
                let apartment = values["ek_modus"]?.text == "wohnung"
                if apartment && ["ek_typ","ek_gs_flaeche","ek_brw","ek_gs_abschlag","ek_flst"].contains(f.id) { return false }
                if !apartment && ["ek_wtyp","ek_mea","ek_etage","ek_hausgeld","ek_hausgeld_nu"].contains(f.id) { return false }
            }
            return true
        }
        var buckets: [(String, [FormField])] = []
        for f in fields {
            let title: String
            if let entry = repeated(f.id) { title = "\(familyTitle(entry.family)) \(entry.index + 1)" }
            else { title = (f.section ?? group.title).replacingOccurrences(of: "^[^A-Za-zÄÖÜäöü]+", with: "", options: .regularExpression) }
            if buckets.last?.0 == title { buckets[buckets.count - 1].1.append(field(f)) } else { buckets.append((title,[field(f)])) }
        }
        var steps: [EditorStep] = []
        for (title, fields) in buckets {
            for start in stride(from: 0, to: fields.count, by: 4) {
                let page = Array(fields[start..<min(start + 4, fields.count)])
                steps.append(EditorStep(id: group.id + ":" + page[0].id, title: title, hint: "Erfasse diese Angaben und gehe anschließend weiter. Dein Arbeitsstand wird automatisch gespeichert.", fields: page))
            }
        }
        return steps
    }
    static func repeated(_ id: String) -> (family: String, index: Int)? {
        for family in ["rl","mr","vgl","wk","msp"] {
            guard id.hasPrefix(family + "_") else { continue }
            let suffix = id.reversed().prefix { $0.isNumber }.reversed()
            guard let index = Int(String(suffix)) else { return nil }
            // pm2 ist Bestandteil des Mietpreis-Feldnamens, nicht der Zeilennummer.
            return (family, family == "mr" && id.hasPrefix("mr_pm2") ? Int(id.dropFirst(6)) ?? 0 : index)
        }
        return nil
    }
    static func familyTitle(_ family: String) -> String { ["rl":"Raum", "mr":"Mieteinheit", "vgl":"Vergleichsobjekt", "wk":"Wertkorrektur", "msp":"Mietquelle"][family] ?? "Eintrag" }
}
