import { requireMainAdmin, sendError } from './_lib/core.js';
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Metodo nao permitido.'});
  try{
    const caller=await requireMainAdmin(req);
    const {email,password,name,role}=req.body||{};
    if(!email||!password||password.length<6) return res.status(400).json({error:'Informe e-mail e senha com pelo menos 6 caracteres.'});
    if(!['editor','viewer'].includes(role)) return res.status(400).json({error:'Perfil invalido.'});
    const authResponse=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.FIREBASE_API_KEY}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
    });
    const authData=await authResponse.json();
    if(!authResponse.ok) return res.status(400).json({error:authData?.error?.message||'Falha ao criar conta.'});
    const fields={
      name:{stringValue:String(name||'')},email:{stringValue:String(email)},role:{stringValue:role},active:{booleanValue:true},
      createdAt:{timestampValue:new Date().toISOString()},createdBy:{stringValue:String(caller.user.email||'')}
    };
    const profileResponse=await fetch(`https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${authData.localId}`,{
      method:'PATCH',headers:{Authorization:`Bearer ${caller.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({fields})
    });
    if(!profileResponse.ok) return res.status(500).json({error:'Conta criada, mas o perfil do painel nao foi salvo.'});
    return res.status(200).json({ok:true,uid:authData.localId,email});
  }catch(error){sendError(res,error);}
}
