import {copyFileSync} from 'node:fs';
for(const name of ['kern','modell','daten'])copyFileSync('js/'+name+'.js','ios/ImmoApp/Resources/'+name+'.js');
console.log('Lokale Rechenbausteine für die native iOS-App aktualisiert.');
