import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3, requireEditor, sendError } from './_lib/core.js';
export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Metodo nao permitido.'});
  try{
    await requireEditor(req);
    const s3=getS3(); let continuationToken,bytes=0,count=0;
    do{
      const data=await s3.send(new ListObjectsV2Command({Bucket:process.env.R2_BUCKET,ContinuationToken:continuationToken,MaxKeys:1000}));
      for(const object of data.Contents||[]){bytes+=Number(object.Size||0);count++;}
      continuationToken=data.IsTruncated?data.NextContinuationToken:undefined;
    }while(continuationToken);
    return res.status(200).json({ok:true,count,bytes});
  }catch(error){sendError(res,error);}
}
