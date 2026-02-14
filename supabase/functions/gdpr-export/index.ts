import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createAdminClient, authenticateUser } from '../_shared/supabase.ts';

interface GDPRExportData {
  export_date: string;
  data_categories: string[];
  user_id: string;
  profile: any;
  cases: any[];
  documents: any[];
  security_logs: any[];
  ai_usage_logs: any[];
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
        {
          status: 405,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authorization header is required',
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const adminClient = createAdminClient();
    const user = await authenticateUser(adminClient, authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Starting GDPR export for user: ${user.id}`);

    // Fetch all user data in parallel
    const [
      { data: profileData, error: profileError },
      { data: casesData, error: casesError },
      { data: documentsData, error: documentsError },
      { data: securityLogsData, error: securityLogsError },
      { data: aiUsageLogsData, error: aiUsageLogsError },
    ] = await Promise.all([
      adminClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      adminClient
        .from('cases')
        .select('*')
        .or(`agent_profile_id.eq.${user.id},client_profile_id.eq.${user.id}`),
      adminClient
        .from('documents')
        .select('*')
        .eq('profile_id', user.id),
      adminClient
        .from('security_logs')
        .select('*')
        .eq('user_id', user.id),
      adminClient
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', user.id),
    ]);

    // Check for errors
    if (profileError) {
      console.error('Profile query error:', profileError);
    }
    if (casesError) {
      console.error('Cases query error:', casesError);
    }
    if (documentsError) {
      console.error('Documents query error:', documentsError);
    }
    if (securityLogsError) {
      console.error('Security logs query error:', securityLogsError);
    }
    if (aiUsageLogsError) {
      console.error('AI usage logs query error:', aiUsageLogsError);
    }

    // Compile export data
    const exportData: GDPRExportData = {
      export_date: new Date().toISOString(),
      data_categories: [
        'profile',
        'cases',
        'documents',
        'security_logs',
        'ai_usage_logs',
      ],
      user_id: user.id,
      profile: profileData || null,
      cases: casesData || [],
      documents: documentsData || [],
      security_logs: securityLogsData || [],
      ai_usage_logs: aiUsageLogsData || [],
    };

    console.log(
      `GDPR export completed for user ${user.id}. Cases: ${exportData.cases.length}, Documents: ${exportData.documents.length}, Security logs: ${exportData.security_logs.length}, AI usage logs: ${exportData.ai_usage_logs.length}`
    );

    // Return the export data
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...getCorsHeaders(),
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition':
          `attachment; filename="gdpr-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
