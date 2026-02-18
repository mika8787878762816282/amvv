import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(`[Create-User] Request received: ${req.method} ${req.url}`);

        // Verify the caller is an admin
        const authHeader = req.headers.get('Authorization');
        console.log(`[Create-User] Auth header present: ${!!authHeader}`);

        if (!authHeader) {
            throw new Error('Missing authorization header');
        }

        // Create a client with the caller's JWT to check their role
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
        if (callerError || !caller) {
            console.error("[Create-User] Auth validation failed:", callerError);
            throw new Error('Invalid authentication token');
        }

        console.log(`[Create-User] Caller authenticated: ${caller.id}`);

        // Check if caller is admin
        const { data: callerProfile } = await callerClient
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single();

        console.log(`[Create-User] Caller role: ${callerProfile?.role}`);

        if (callerProfile?.role !== 'admin') {
            throw new Error('Only admins can create users');
        }

        // Use service role key for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email, password, role, enabled_features, n8n_config } = await req.json();

        // 1. Create user in auth.users
        const { data: user, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createUserError) throw createUserError;

        // 2. Update profile with specific settings
        // The trigger on_auth_user_created will have already inserted a default profile
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: role || 'user',
                enabled_features: enabled_features || ["dashboard", "devis", "factures", "clients", "rdv"],
                n8n_config: n8n_config || {}
            })
            .eq('id', user.user.id);

        if (updateProfileError) throw updateProfileError;

        return new Response(
            JSON.stringify({ user: user.user, message: 'User created successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error("[Create-User] Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
