import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getS3, requireEditor, sendError } from './_lib/core.js';
export default async function handler(req,res){
  if(req.method!=='DELETE') return res.status(405).json({error:'Metodo nao permitido.'});
  try{
    await requireEditor(req);
    const key=String(req.body?.key||'');
    if(!key||key.includes('..')) return res.status(400).json({error:'Chave invalida.'});
    await getS3().send(new DeleteObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}));
    return res.status(200).json({ok:true});
  }catch(error){sendError(res,error);}
}
