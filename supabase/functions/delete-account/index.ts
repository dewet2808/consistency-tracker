import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const url   = Deno.env.get('SUPABASE_URL') ?? ''

  // Verify the caller's JWT and get their user ID
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser(token)
  if (userError || !user) {
    return json({ error: 'Invalid or expired token' }, 401)
  }

  // Delete the user — requires the service role key, which never leaves this function
  const adminClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return json({ error: deleteError.message }, 500)
  }

  return json({ success: true }, 200)
})

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
