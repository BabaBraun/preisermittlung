import UIKit

// Nativer PDF-Bericht: Text und Bilder direkt zeichnen, kein HTML-Renderer.
enum NativeReport {
    static func export(project: PropertyProject, engine: CalculationEngine, schema: FormSchema) throws -> URL {
        let result = try engine.calculate(project.rawFields)
        let bounds = CGRect(x: 0, y: 0, width: 595, height: 842)
        let renderer = UIGraphicsPDFRenderer(bounds: bounds)
        let data = renderer.pdfData { context in
            var y: CGFloat = 48, page = 0
            func newPage() {
                context.beginPage(); page += 1; y = 48
                ("ImmoApp · \(project.name) · Seite \(page)" as NSString).draw(in: CGRect(x: 40, y: 805, width: 515, height: 20), withAttributes: [.font:UIFont.systemFont(ofSize: 9),.foregroundColor:UIColor.secondaryLabel])
            }
            func text(_ value: String, bold: Bool = false, size: CGFloat = 11) {
                let style = NSMutableParagraphStyle(); style.lineBreakMode = .byWordWrapping
                let attrs: [NSAttributedString.Key:Any] = [.font:bold ? UIFont.boldSystemFont(ofSize: size) : UIFont.systemFont(ofSize: size),.foregroundColor:UIColor.black,.paragraphStyle:style]
                // Lange Texte in Absätzen zeichnen, damit sie über Seitengrenzen erhalten bleiben.
                for paragraph in value.components(separatedBy: "\n") {
                    var rest = paragraph
                    repeat {
                        var part = String(rest.prefix(1800))
                        let measure = (part as NSString).boundingRect(with: CGSize(width: 515, height: CGFloat.greatestFiniteMagnitude), options: [.usesLineFragmentOrigin,.usesFontLeading], attributes: attrs, context: nil)
                        if y + measure.height > 770 { newPage() }
                        if measure.height > 700 { part = String(rest.prefix(800)) }
                        let h = (part as NSString).boundingRect(with: CGSize(width: 515, height: CGFloat.greatestFiniteMagnitude), options: [.usesLineFragmentOrigin,.usesFontLeading], attributes: attrs, context: nil).height
                        (part as NSString).draw(in: CGRect(x: 40, y: y, width: 515, height: ceil(h) + 2), withAttributes: attrs)
                        y += ceil(h) + 8; rest = String(rest.dropFirst(part.count))
                    } while !rest.isEmpty
                }
            }
            newPage()
            text("Immobilienbewertung", bold: true, size: 24)
            text(project.name, bold: true, size: 17)
            text(project.address)
            text("Stichtag: " + (project.fields["ek_stichtag"]?.text ?? "–"))
            text(result.price.status == "ok" ? "Angaben und Nachweise vollständig; keine automatische fachliche Zertifizierung." : "ENTWURF – Angaben und Nachweise ergänzen.", bold: true)
            text(PricePresentation(result).label + ": " + PricePresentation(result).headline, bold: true, size: 18)
            for (label,key) in [("Bodenwert","bodenwert"),("Sach-/Vergleichswert","substanz"),("Ertragswert","ertrag"),("Gewichteter Grundwert","mittel"),("Zusätzlicher PV-Marktansatz","pvWert"),("Zusätzlicher Energie-Marktansatz","energieWert"),("Marktbelastung durch Rechte","niessWert"),("Erbbaurechtskorrektur","erbbauAbzug")] { text(label + ": " + money(result.number(key))) }
            text("Prüfhinweise", bold: true, size: 15)
            for issue in result.price.issues { text("• " + issue.text) }
            if result.lending.status != "inaktiv" {
                text("Beleihungsmodell – " + (result.lending.status == "ok" ? "Angaben vollständig" : "Entwurf"), bold: true, size: 15)
                text("Beleihungsszenario: " + money(result.number("beleihungswert")))
                text("Kapitalisierungszins: " + result.number("bwZins").formatted() + " %")
                for issue in result.lending.issues { text("• " + issue.text) }
                for adjustment in result.details["bwKorrekturen"] as? [String] ?? [] { text(adjustment) }
            }
            text("Gesonderte wirtschaftliche Szenarien", bold: true, size: 15)
            text("PV-Ertragsbarwert: " + money((result.details["pvPotential"] as? NSNumber)?.doubleValue ?? 0))
            text("Energiekosten-Barwert: " + money((result.details["enKostenBarwert"] as? NSNumber)?.doubleValue ?? 0))
            text("Die Szenarien sind nicht automatisch ein zusätzlicher Marktwert. Die rechnerische Bewertung ersetzt kein Verkehrswertgutachten.")
            for group in schema.groups {
                let fields = group.fields.filter { let v = project.fields[$0.id]?.text ?? ""; return !v.isEmpty && v != "false" && v != "0" }
                if fields.isEmpty { continue }; text(group.title, bold: true, size: 15)
                for field in fields { let v = project.fields[field.id]?.text ?? ""; text(field.label + ": " + (field.options.first(where: { $0.value == v })?.label ?? (v == "true" ? "Ja" : v))) }
            }
            for photo in project.attachments["photos"]?.array ?? [] {
                guard let b64 = photo.object["data"]?.text.split(separator: ",", maxSplits: 1).last, let bytes = Data(base64Encoded: String(b64)), let image = UIImage(data: bytes) else { continue }
                newPage(); text(photo.object["caption"]?.text.nonempty ?? "Objektfoto", bold: true, size: 15)
                let ratio = min(515 / image.size.width, 650 / image.size.height)
                image.draw(in: CGRect(x: 40, y: y, width: image.size.width * ratio, height: image.size.height * ratio))
            }
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("ImmoApp-Bericht-\(project.id.uuidString).pdf")
        try data.write(to: url, options: .atomic); return url
    }
}
