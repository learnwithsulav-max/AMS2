import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {response}=await requireAdmin(request); if(response)return response;
  const {id}=await params;
  const {data,error}=await admin.from('billing_orders').select('voucher_path').eq('id',id).maybeSingle();
  if(error||!data?.voucher_path)return NextResponse.json({error:'Voucher was not found.'},{status:404});
  const {data:link,error:linkError}=await admin.storage.from('payment-vouchers').createSignedUrl(data.voucher_path,60);
  if(linkError||!link)return NextResponse.json({error:'Could not open voucher.'},{status:500});
  return NextResponse.json({url:link.signedUrl});
}
