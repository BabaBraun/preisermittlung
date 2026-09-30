import XCTest
final class NativeUITests: XCTestCase {
    func testTestPropertyShowsCalculatedPriceInRealResultScreen() {
        let app = XCUIApplication(); app.launchArguments = ["--testimmobilien-einspielen"]; app.launch()
        app.tabBars.buttons["Objekte"].tap()
        if !app.searchFields.firstMatch.exists { app.swipeDown() }
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout:5)); search.tap(); search.typeText("Einfamilienhaus mit PV")
        let property = app.staticTexts["TEST – Einfamilienhaus mit PV"]
        XCTAssertTrue(property.waitForExistence(timeout:5)); property.tap()
        XCTAssertTrue(app.staticTexts["objectPrice"].label.contains("472.970"))
        app.buttons["openResults"].tap()
        let price = app.staticTexts["calculatedPrice"]
        XCTAssertTrue(price.waitForExistence(timeout:5))
        XCTAssertTrue(price.label.contains("472.970"),"Angezeigt: " + price.label)
        XCTAssertFalse(price.label == "0,00 €")
    }
    func testGuidedNumericEntryNextFieldAndSavedProgress() {
        let app = XCUIApplication(); app.launch()
        XCTAssertTrue(app.buttons["newProperty"].waitForExistence(timeout:10)); app.buttons["newProperty"].tap()
        app.buttons["startWizard"].tap()
        XCTAssertTrue(app.staticTexts["stepCounter"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["stepCounter"].label.contains("Schritt 1"))
        app.buttons["stepNext"].tap()
        let stepImage = XCTAttachment(screenshot: app.screenshot()); stepImage.name = "Kurze-Eingabeseite"; stepImage.lifetime = .keepAlways; add(stepImage)
        let area = app.textFields["ek_wohnflaeche"]
        XCTAssertTrue(area.waitForExistence(timeout:5)); area.tap(); area.typeText("145.5")
        XCTAssertFalse(app.keyboards.keys["A"].exists)
        let keyboardImage = XCTAttachment(screenshot: app.screenshot()); keyboardImage.name = "Zahlenfeld-mit-Navigation"; keyboardImage.lifetime = .keepAlways; add(keyboardImage)
        XCTAssertTrue(app.buttons["nextInput"].waitForExistence(timeout:5)); app.buttons["nextInput"].tap()
        app.buttons["nextInput"].tap()
        let year = app.textFields["ek_baujahr"]; year.typeText("1985")
        app.buttons["Fertig"].tap()
        if !area.exists { app.swipeDown() }
        XCTAssertEqual(area.value as? String,"145,5")
        XCTAssertEqual(year.value as? String,"1985")
        app.buttons["stepNext"].tap(); XCTAssertTrue(app.staticTexts["stepCounter"].label.contains("Schritt 3"))
        app.buttons["stepBack"].tap(); XCTAssertEqual(area.value as? String,"145,5")
        app.navigationBars.buttons.element(boundBy:0).tap()
        app.buttons["startWizard"].tap()
        XCTAssertTrue(app.staticTexts["stepCounter"].label.contains("Schritt 2"))
        XCTAssertEqual(app.textFields["ek_wohnflaeche"].value as? String,"145,5")
        XCTAssertEqual(app.webViews.count,0)
    }
    func testCreateEditCalculateAndReturnToObjects() {
        let app = XCUIApplication(); app.launch()
        XCTAssertTrue(app.buttons["newProperty"].waitForExistence(timeout: 10))
        app.buttons["newProperty"].tap()
        let name = app.textFields["propertyName"]
        XCTAssertTrue(name.waitForExistence(timeout: 5)); name.tap(); name.typeText("Native Prüfung")
        app.buttons["openResults"].tap()
        XCTAssertTrue(app.staticTexts["calculatedPrice"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.webViews.count, 0)
        app.tabBars.buttons["Objekte"].tap()
        XCTAssertTrue(app.staticTexts["Native Prüfung"].waitForExistence(timeout: 5))
        app.terminate(); app.launch(); app.tabBars.buttons["Objekte"].tap()
        XCTAssertTrue(app.staticTexts["Native Prüfung"].waitForExistence(timeout: 5))
    }
}
