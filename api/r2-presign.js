import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3, requireEditor, safeSlug, extension, sendError } from './_lib/core.js';
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Metodo nao permitido.'});
  try{
    await requireEditor(req);
    const {filename,contentType,category,type,displayName}=req.body||{};
    const allowed=new Set(['video/mp4','image/jpeg','image/png','image/webp']);
    if(!filename||!contentType||!allowed.has(contentType)) return res.status(400).json({error:'Use MP4, JPG, PNG ou WEBP.'});
    const cat=category==='advertising'?'advertising':'hotel';
    const folder=type==='image'?'images':'videos';
    const stamp=new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
    const random=Math.random().toString(36).slice(2,8);
    const key=`${cat}/${folder}/${safeSlug(displayName||filename.replace(/\.[^.]+$/,''))||'arquivo'}-${stamp}-${random}${extension(filename)}`;
    const command=new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:key,ContentType:contentType});
    const uploadUrl=await getSignedUrl(getS3(),command,{expiresIn:600});
    const publicUrl=`${process.env.R2_PUBLIC_URL.replace(/\/$/,'')}/${key}`;
    return res.status(200).json({uploadUrl,publicUrl,key,expiresIn:600});
  }catch(error){sendError(res,error);}
}
