import Foundation

struct PricePresentation {
    let headline: String
    let label: String
    let available: Bool
    init(_ calculation: Calculation) {
        let price = calculation.number("empfehlung")
        available = price.isFinite && price > 0 && calculation.price.status != "fehler"
        headline = available ? money(price) : "Noch nicht berechenbar"
        label = available ? (calculation.price.status == "ok" ? "Preisempfehlung" : "Vorläufiger Rechenwert") : "Bewertungsgrundlagen ergänzen"
    }
}
