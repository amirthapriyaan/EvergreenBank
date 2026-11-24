import {FIREBASE_API_KEY,FIREBASE_PROJECT_ID,FIRESTORE_BASE,SWITCH_BASE} from './config';
import {liveApi} from '../live-api';

const enc = s => encodeURIComponent(s);
function fromValue(v={}) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values||[]).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields||{});
  return null;
}
function fromFields(fields={}) { return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,fromValue(v)])); }
function toValue(v) {
  if (v===null || v===undefined) return {nullValue:null};
  if (typeof v==='string') return {stringValue:v};
  if (typeof v==='boolean') return {booleanValue:v};
  if (Number.isInteger(v)) return {integerValue:String(v)};
  if (typeof v==='number') return {doubleValue:v};
  if (Array.isArray(v)) return {arrayValue:{values:v.map(toValue)}};
  if (typeof v==='object') return {mapValue:{fields:toFields(v)}};
  return {stringValue:String(v)};
}
function toFields(data) { return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,toValue(v)])); }
async function request(url, options={}, token) {
  const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
  const r=await fetch(url,{...options,headers:{...headers,...options.headers}});
  const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body.error?.message || `Request failed (${r.status})`);
  return body;
}
export async function signIn(email,password) {
  if(FIREBASE_API_KEY.startsWith('PASTE_')) throw new Error('Add your Firebase Web API key in src/evergreen/config.js first.');
  const x=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,{method:'POST',body:JSON.stringify({email,password,returnSecureToken:true})});
  const profile=await getDoc('users',x.localId,x.idToken);
  if(!profile) throw new Error('Firebase login succeeded, but users/'+x.localId+' is missing in Firestore.');
  if(!['ACTIVE','PENDING_KYC'].includes(profile.status)) throw new Error('Your bank profile is not active. Contact the bank administrator.');
  let switchToken=null; try { const sw=await liveApi(SWITCH_BASE,'/banks/P675/sign-in',{data:{email:x.email,password}}); switchToken=sw.token; } catch {}  return {token:x.idToken,refreshToken:x.refreshToken,uid:x.localId,email:x.email,profile,switchToken};
}
export async function registerUser({name,email,password}) {
  if(FIREBASE_API_KEY.startsWith('PASTE_')) throw new Error('Add your Firebase Web API key in src/evergreen/config.js first.');
  const x=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,{method:'POST',body:JSON.stringify({email,password,returnSecureToken:true})});
  const token=x.idToken, uid=x.localId, now=new Date().toISOString();
  await setDoc('users',uid,{uid,bankId:'P675',fullName:name,email,role:'CUSTOMER',status:'PENDING_KYC',createdAt:now},token);
  await setDoc('kyc_requests',`KYC_${uid}`,{uid,documentPaths:[],openingDepositMinor:100000,status:'PENDING',reviewedBy:null,createdAt:now},token);
  return {uid,email};
}
export async function getDoc(collection,id,token) {
  try {const x=await request(`${FIRESTORE_BASE}/${collection}/${enc(id)}`,{},token);return {id:x.name.split('/').pop(),...fromFields(x.fields)};}
  catch(e){if(String(e.message).includes('NOT_FOUND'))return null;throw e;}
}
export async function setDoc(collection,id,data,token,mask=false) {
  const qs=mask?'?'+Object.keys(data).map(k=>'updateMask.fieldPaths='+enc(k)).join('&'):'';
  return request(`${FIRESTORE_BASE}/${collection}/${enc(id)}${qs}`,{method:'PATCH',body:JSON.stringify({fields:toFields(data)})},token);
}
export async function addDoc(collection,data,token,id=crypto.randomUUID()) {
  await setDoc(collection,id,data,token); return id;
}
export async function listDocs(collection,token,field=null,value=null) {
  const url=`${FIRESTORE_BASE}:runQuery`;
  const body={structuredQuery:{from:[{collectionId:collection}],...(field?{where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:toValue(value)}}}:{}),limit:100}};
  const rows=await request(url,{method:'POST',body:JSON.stringify(body)},token);
  return rows.filter(x=>x.document).map(x=>({id:x.document.name.split('/').pop(),...fromFields(x.document.fields)}));
}
export async function logout(token) {
  try { await request(`https://identitytoolkit.googleapis.com/v1/accounts:signOut?key=${FIREBASE_API_KEY}`,{method:'POST',body:JSON.stringify({})},token); } catch {}
}
export async function createBeneficiary(user, data) {
  const id=crypto.randomUUID();
  await addDoc('beneficiaries',{uid:user.uid,beneficiaryBankId:data.bankId||'P675',beneficiaryIfsc:data.ifsc.toUpperCase(),beneficiaryAccountNumber:data.accountNumber,name:data.name,status:'ACTIVE',createdAt:new Date().toISOString()},user.token,id);
}
export async function applyLoan(user, data) {
  await addDoc('loans',{uid:user.uid,accountId:data.accountId,requestedMinor:Math.round(Number(data.amount)*100),status:'PENDING',purpose:data.purpose,createdAt:new Date().toISOString()},user.token);
}
export async function submitTransfer(user, account, payload) {
  const idempotencyKey=crypto.randomUUID();
  if(!user.switchToken) throw new Error('Shared Banking Switch sign-in failed for this account. Ask the project team to enable your bank login on the switch.');
  const res=await liveApi(SWITCH_BASE,'/banks/P675/transfers',{token:user.switchToken,data:payload,key:idempotencyKey});
  if(res.status==='COMPLETED'||res.status==='SUCCESS'){
    await addDoc('transfers',{transferId:res.transferId||idempotencyKey,type:payload.destinationIfsc==='AMIR0B6T3XY'?'INTERNAL':'INTERBANK',fromAccountId:account.accountId,toAccountId:null,destinationIfsc:payload.destinationIfsc,amountMinor:payload.amountMinor,status:'COMPLETED',idempotencyKey,requestedByUid:user.uid,createdAt:new Date().toISOString()},user.token,res.transferId||idempotencyKey);
  }
  return res;
}
export async function reviewKyc(user, row, decision) {
  const now=new Date().toISOString();
  await setDoc('kyc_requests',row.id,{status:decision,reviewedBy:user.uid,reviewedAt:now},user.token,true);
  await addDoc('audit_logs',{logid:crypto.randomUUID(),description:`KYC ${decision} for ${row.uid}`,actorUid:user.uid,createdAt:now},user.token);
  if(decision==='APPROVE'){
    const accountId='EG'+Date.now().toString().slice(-10);
    await addDoc('accounts',{customerUid:row.uid,accountNumber:'EVERGREEN'+accountId.slice(-6),currency:'INR',status:'ACTIVE',postedBalanceMinor:100000,heldMinor:0,accountId,createdAt:now},user.token,accountId);
    await setDoc('users',row.uid,{status:'ACTIVE'},user.token,true);
    await setDoc('portfolios',row.uid,{uid:row.uid,accountIds:[accountId],loanIds:[]},user.token);
    await addDoc('ledger_entries',{transferId:'OPENING_'+accountId,accountId,direction:'CREDIT',amountMinor:100000,postedAt:now,description:'One-time demo opening credit'},user.token);
  } else if(decision==='REJECT') {
    await setDoc('users',row.uid,{status:'REJECTED'},user.token,true);
  } else {
    await setDoc('users',row.uid,{status:'PENDING_KYC'},user.token,true);
  }
}

export async function updateLimit(user, accountId, perTransferMinor, dailyMinor) {
  await setDoc('transfer_limits',accountId,{perTransferMinor,dailyMinor,updatedBy:user.uid,updatedAt:new Date().toISOString()},user.token);
  await addDoc('audit_logs',{logid:crypto.randomUUID(),description:`Transfer limits updated for ${accountId}`,actorUid:user.uid,createdAt:new Date().toISOString()},user.token);
}
