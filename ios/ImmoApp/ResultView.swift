import SwiftUI

func money(_ value: Double) -> String { value.formatted(.currency(code: "EUR").locale(Locale(identifier: "de_DE"))) }
struct ResultView: View {
    @Bindable var store: ProjectStore
    var projectID: UUID
    var body: some View {
        if let project = store.project(projectID) {
            switch Result(catching: { try store.engine.calculate(project.rawFields) }) {
            case .failure(let error): ContentUnavailableView("Berechnung nicht verfügbar", systemImage: "exclamationmark.triangle", description: Text(error.localizedDescription))
            case .success(let calc):
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(calc.price.status == "ok" ? "Dokumentierter Preisansatz" : "Entwurf – Grundlagen ergänzen").font(.headline).foregroundStyle(calc.price.status == "ok" ? .teal : .orange)
                            Text(PricePresentation(calc).headline).font(.largeTitle.bold()).accessibilityIdentifier("calculatedPrice")
                            Text(calc.price.status == "ok" ? "Angaben und Nachweise vollständig; Quellen nicht automatisch fachlich bestätigt." : "Der Rechenwert ist noch keine geprüfte Preisempfehlung.").font(.footnote).foregroundStyle(.secondary)
                        }.padding(.vertical, 8)
                    }
                    Section("Rechenweg") {
                        amount("Bodenwert", calc.number("bodenwert"))
                        amount("Sach- / Vergleichswert", calc.number("substanz"))
                        amount("Ertragswert", calc.number("ertrag"))
                        amount("Gewichteter Grundwert", calc.number("mittel"))
                        amount("Zusätzlicher PV-Marktansatz", calc.number("pvWert"))
                        amount("Zusätzlicher Energie-Marktansatz", calc.number("energieWert"))
                        amount("Marktbelastung durch Rechte", -calc.number("niessWert"))
                        amount("Erbbaurechtskorrektur", -calc.number("erbbauAbzug"))
                        amount("Weitere Wertkorrekturen", -calc.number("wkSumme"))
                    }
                    if !calc.price.issues.isEmpty {
                        Section("Noch zu prüfen") { ForEach(calc.price.issues) { issue in issueLink(issue) } }
                    }
                    Section("Beleihungsmodell") {
                        Text(calc.lending.status == "inaktiv" ? "Nicht aktiviert" : calc.lending.status == "ok" ? "Angaben und Nachweise vollständig" : "Entwurf – separat prüfen").foregroundStyle(.secondary)
                        if calc.lending.status != "inaktiv" {
                            amount("Beleihungsszenario", calc.number("beleihungswert"))
                            LabeledContent("Verwendeter Kapitalisierungszins", value: calc.number("bwZins").formatted() + " %")
                            amount("Jährliche Bewirtschaftungskosten", calc.number("bwBewirt"))
                            ForEach(calc.lending.issues) { issue in issueLink(issue) }
                        }
                    }
                    Section("Gesonderte Szenarien") {
                        amount("PV-Ertragsbarwert", (calc.details["pvPotential"] as? NSNumber)?.doubleValue ?? 0)
                        amount("Energiekosten-Barwert", (calc.details["enKostenBarwert"] as? NSNumber)?.doubleValue ?? 0)
                        Text("Wirtschaftliche Szenarien sind von den zusätzlich verwendeten Marktansätzen zu unterscheiden.").font(.footnote).foregroundStyle(.secondary)
                    }
                }.navigationTitle("Ergebnis").navigationBarTitleDisplayMode(.inline)
            }
        }
    }
    private func amount(_ label: String, _ value: Double) -> some View { LabeledContent(label, value: money(value)).monospacedDigit() }
    @ViewBuilder private func issueLink(_ issue: CheckIssue) -> some View {
        if let group = store.schema.groups.first(where: { $0.fields.contains { $0.id == issue.feld } }) {
            NavigationLink { GroupEditor(store: store, projectID: projectID, group: group, initialFieldID: issue.feld) } label: { Label(issue.text, systemImage: "exclamationmark.circle").foregroundStyle(.orange) }
        } else { Label(issue.text, systemImage: "exclamationmark.circle").foregroundStyle(.orange) }
    }
}
