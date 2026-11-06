const encode=new TextEncoder(),decode=new TextDecoder();
const base64=bytes=>btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));
const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export const randomSalt=()=>base64(crypto.getRandomValues(new Uint8Array(16)));
export async function derive(password,salt){
  const material=await crypto.subtle.importKey('raw',encode.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(data,key,salt){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const result=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encode.encode(JSON.stringify(data)));
  return {format:'simplexbudget-v1',salt,iv:base64(iv),payload:base64(new Uint8Array(result))};
}
export async function openVault(box,key){
  if(box?.format!=='simplexbudget-v1'||typeof box.payload!=='string'||typeof box.iv!=='string')throw Error('Backup non valido.');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(box.iv)},key,bytes(box.payload));
  return JSON.parse(decode.decode(plain));
}
