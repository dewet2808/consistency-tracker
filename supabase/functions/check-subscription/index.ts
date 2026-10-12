import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ isPro: false }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const url   = Deno.env.get('SUPABASE_URL') ?? ''

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser(token)
  if (userError || !user) {
    return json({ isPro: false }, 401)
  }

  const rcKey = Deno.env.get('REVENUECAT_API_SECRET_KEY')
  if (!rcKey) return json({ isPro: false }, 200)

  const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${user.id}`, {
    headers: {
      'Authorization': `Bearer ${rcKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!rcRes.ok) return json({ isPro: false }, 200)

  const data = await rcRes.json()
  const pro  = data.subscriber?.entitlements?.pro
  const isPro = !!pro && (!pro.expires_date || new Date(pro.expires_date) > new Date())

  return json({ isPro }, 200)
})

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
