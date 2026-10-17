import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function authorize(req:Request){const user=await getChatGPTUser();if(!user)throw Object.assign(Error('请使用 ChatGPT 登录后重试'),{status:401});if(req.method!=='GET'){const origin=req.headers.get('origin');if(origin!==new URL(req.url).origin)throw Object.assign(Error('请求来源不匹配'),{status:403});}return user;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
export function failure(e:unknown){return json({error:e instanceof Error?e.message:'请求失败'},(e as {status?:number})?.status||(e instanceof Error&&e.name==='TimeoutError'?504:400));}
