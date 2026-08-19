import { assertEnv, sendError } from './_lib/core.js';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Metodo nao permitido.'});
  try{assertEnv();return res.status(200).json({ok:true,storage:'Cloudflare R2',bucket:process.env.R2_BUCKET,environment:process.env.VERCEL_ENV||'local'});}
  catch(error){sendError(res,error);}
}
