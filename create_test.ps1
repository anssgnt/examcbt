$content = "
const SUPABASE_CONFIG={enabled:!0,url:'https://dmydinmosdxazypdwbed.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8'};
async function fetchWithRetry(e,t){const r=await fetch(e,t);return r;}
async function fetchSupabase(e,t={}){
    const r=new URLSearchParams;for(const e in t)r.append(e,t[e]);
    const o=`${SUPABASE_CONFIG.url}/rest/v1/${e}?${r.toString()}`;
    const res=await fetchWithRetry(o,{method:'GET',headers:{apikey:SUPABASE_CONFIG.anonKey,Authorization:`Bearer ${SUPABASE_CONFIG.anonKey}`}});
    const data=await res.json();
    console.log('Status:', res.status);
    console.log('Data length:', data.length);
    console.log('Error:', data.error||data.message||null);
}
fetchSupabase('hasil', {limit: 10000}).catch(console.error);
"
Set-Content test_limit.js $content
