import {test,expect} from '@playwright/test';
import {appOeffnen,keineSkriptfehler} from './helfer.mjs';
test('modulare App initialisiert alle Funktionen ohne Skriptfehler',async({page})=>{await appOeffnen(page);await keineSkriptfehler(page);expect(await page.evaluate(()=>typeof window._R)).toBe('object');});
