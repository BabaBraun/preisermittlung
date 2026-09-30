import {chromium}from'@playwright/test';import{writeFileSync}from'node:fs';
import{SZENARIEN}from'../tests/fixtures/szenarien.mjs';import{appOeffnen,fallAnwenden}from'../tests/e2e/helfer.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const page=await browser.newPage();await appOeffnen(page,{pfad:'http://127.0.0.1:49301/index.html'});const cases=[];
for(const scenario of SZENARIEN){await fallAnwenden(page,scenario);cases.push(await page.evaluate(name=>({name,fields:collect(),numbers:Object.fromEntries(Object.entries(window._R).filter(([k,v])=>typeof v==='number'&&Number.isFinite(v)))}),scenario.name));}
writeFileSync('ios/ImmoAppTests/referenzfaelle.json',JSON.stringify(cases,null,2));await browser.close();console.log(cases.length+' native Vergleichsfälle aufgenommen.');
