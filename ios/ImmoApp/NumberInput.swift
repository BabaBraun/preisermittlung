import SwiftUI
import UIKit

struct NumberInput: UIViewRepresentable {
    @Binding var value: JSONValue
    var field: FormField
    var focusedID: Binding<String?>
    @Binding var error: String?
    var onPrevious: () -> Void
    var onNext: () -> Void
    var onDone: () -> Void
    func makeUIView(context: Context) -> UITextField {
        let input = UITextField()
        input.delegate = context.coordinator
        input.inputAccessoryView = context.coordinator.toolbar()
        input.keyboardType = InputPolicy.kind(for: field) == .integer ? .numberPad : .decimalPad
        input.textAlignment = .right
        input.font = .preferredFont(forTextStyle: .title3)
        input.adjustsFontForContentSizeCategory = true
        input.placeholder = "0"
        input.accessibilityIdentifier = field.id
        input.accessibilityLabel = field.label
        input.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        input.addTarget(context.coordinator, action: #selector(Coordinator.changed(_:)), for: .editingChanged)
        return input
    }
    func updateUIView(_ input: UITextField, context: Context) {
        context.coordinator.parent = self
        if !input.isFirstResponder { input.text = displayText }
        let desiredFocus = focusedID.wrappedValue == field.id
        if desiredFocus && !input.isFirstResponder { DispatchQueue.main.async { input.becomeFirstResponder() } }
        if !desiredFocus && input.isFirstResponder { input.resignFirstResponder() }
    }
    private var displayText: String { InputPolicy.editingText(value.text, kind: InputPolicy.kind(for: field), groupedAmount: ["€", "€/m²", "m²"].contains(field.unit ?? "")) }
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UITextField, context: Context) -> CGSize? {
        let width = proposal.width ?? 180
        return CGSize(width: width.isFinite && width > 0 ? width : 180, height:44)
    }
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    final class Coordinator: NSObject, UITextFieldDelegate {
        weak var activeInput: UITextField?
        var parent: NumberInput
        func toolbar() -> UIToolbar {
            let bar = UIToolbar(frame:CGRect(x:0,y:0,width:320,height:44))
            let previous = UIBarButtonItem(image:UIImage(systemName:"chevron.up"),style:.plain,target:self,action:#selector(previousField))
            previous.accessibilityLabel = "Vorheriges Feld"
            let next = UIBarButtonItem(image:UIImage(systemName:"chevron.down"),style:.plain,target:self,action:#selector(nextField))
            next.accessibilityLabel = "Nächstes Feld"; next.accessibilityIdentifier = "nextInput"
            var items = [previous,next]
            if InputPolicy.kind(for:parent.field) == .signedDecimal {
                let sign = UIBarButtonItem(title:"±",style:.plain,target:self,action:#selector(signChanged)); sign.accessibilityLabel = "Vorzeichen wechseln"; items.append(sign)
            }
            items.append(UIBarButtonItem(systemItem:.flexibleSpace))
            let done = UIBarButtonItem(title:"Fertig",style:.done,target:self,action:#selector(doneEditing)); done.accessibilityIdentifier = "finishNumericInput"; items.append(done)
            bar.items = items; return bar
        }
        @objc func previousField() { parent.onPrevious() }
        @objc func nextField() { parent.onNext() }
        @objc func doneEditing() { parent.onDone(); activeInput?.resignFirstResponder() }
        @objc func signChanged() {
            guard let input = activeInput else { return }
            let text = input.text ?? ""; input.text = text.hasPrefix("-") || text.hasPrefix("−") ? String(text.dropFirst()) : "-" + text
            changed(input)
        }
        init(_ parent: NumberInput) { self.parent = parent }
        func textFieldDidBeginEditing(_ field: UITextField) {
            activeInput = field
            parent.focusedID.wrappedValue = parent.field.id
            field.text = parent.displayText
            if parent.displayText == "0" {
                DispatchQueue.main.async { if field.isFirstResponder { field.selectAll(nil) } }
            }
        }
        func textFieldDidEndEditing(_ field: UITextField) { if parent.focusedID.wrappedValue == parent.field.id { parent.focusedID.wrappedValue = nil } }
        @objc func changed(_ input: UITextField) {
            let raw = input.text ?? ""
            parent.value = .string(InputPolicy.kind(for: parent.field) == .integer ? raw : raw.replacingOccurrences(of: ".", with: ","))
            parent.error = nil
        }
        func textField(_ input: UITextField, shouldChangeCharactersIn range: NSRange, replacementString replacement: String) -> Bool {
            let text = ((input.text ?? "") as NSString).replacingCharacters(in: range, with: replacement)
            if InputPolicy.accepts(text, kind: InputPolicy.kind(for: parent.field)) { parent.error = nil; return true }
            parent.error = InputPolicy.kind(for: parent.field) == .integer ? "Hier ist eine ganze Zahl erforderlich." : "Hier sind nur Zahlen und ein Dezimaltrennzeichen erlaubt."
            return false
        }
    }
}
