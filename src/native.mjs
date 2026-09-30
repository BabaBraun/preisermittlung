import {Capacitor,registerPlugin} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
const DeviceLock=registerPlugin('DeviceLock');
export const isNative=()=>Capacitor.isNativePlatform();
export async function shareBlob(blob,name,title){
 const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
 const path='exports/'+Date.now()+'-'+name.replace(/[^\wäöüÄÖÜß .-]/g,'_');
 const file=await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true});
 try{await Share.share({title:title||name,files:[file.uri],dialogTitle:'Datei sichern oder teilen'});return 'geteilt';}
 catch(e){if(/cancel|abgebrochen/i.test(e.message||''))return 'abgebrochen';throw e;}
 finally{await Filesystem.deleteFile({path,directory:Directory.Cache}).catch(()=>{});}
}
export async function authenticate(){return (await DeviceLock.authenticate()).success===true;}
export async function biometricAvailable(){return (await DeviceLock.available()).available===true;}
