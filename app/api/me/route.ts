import {authorize,json,failure} from '@/lib/api';
export async function GET(req:Request){try{const u=await authorize(req);return json({name:u.displayName,cloud:true});}catch(e){return failure(e);}}
