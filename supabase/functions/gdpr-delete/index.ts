import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createAdminClient, authenticateUser } from '../_shared/supabase.ts';

interface DeleteRequest {
  confirm: boolean;
}

interface DeletionSummary {
  success: boolean;
  user_id: string;
  deleted_at: string;
  deleted_records: {
    documents: number;
    cases: number;
    security_logs: number;
    ai_usage_logs: number;
    auth_user: boolean;
    profile: boolean;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only POST requests are supported',
        }),
        {
          status: 405,
          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Authenticate user
    const adminClient = createAdminClient();
    let user: { id: string; email: string };
    try {
      user = await authenticateUser(req, adminClient);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    let body: DeleteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify deletion confirmation
    if (!body.confirm || body.confirm !== true) {
      return new Response(
        JSON.stringify({
          error: 'Deletion not confirmed',
          message: 'You must explicitly confirm deletion by setting confirm to true',
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Starting GDPR deletion for user: ${user.id}`);

    const deletionSummary: DeletionSummary = {
      success: true,
      user_id: user.id,
      deleted_at: new Date().toISOString(),
      deleted_records: {
        documents: 0,
        cases: 0,
        security_logs: 0,
        ai_usage_logs: 0,
        auth_user: false,
        profile: false,
      },
    };

    // Step 1: Delete documents from storage
    console.log(`Step 1: Deleting documents from storage for user ${user.id}`);
    try {
      const { data: documents, error: docListError } = await adminClient
        .from('documents')
        .select('id, file_path')
        .eq('profile_id', user.id);

      if (docListError) {
        console.error('Error listing documents:', docListError);
      } else if (documents && documents.length > 0) {
        const filePathsToDelete = documents
          .map((doc: any) => doc.file_path)
          .filter((path: string) => path);

        if (filePathsToDelete.length > 0) {
          const { error: storageDeleteError } = await adminClient.storage
            .from('case-documents')
            .remove(filePathsToDelete);

          if (storageDeleteError) {
            console.error('Error deleting files from storage:', storageDeleteError);
          } else {
            console.log(`Deleted ${filePathsToDelete.length} files from storage`);
          }
        }
      }
    } catch (error) {
      console.error('Error in document deletion step:', error);
    }

    // Step 2: Delete document records
    console.log(`Step 2: Deleting document records for user ${user.id}`);
    try {
      const { count: docsDeleted, error: docsDeleteError } = await adminClient
        .from('documents')
        .delete()
        .eq('profile_id', user.id);

      if (docsDeleteError) {
        console.error('Error deleting documents:', docsDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.documents = docsDeleted || 0;
        console.log(`Deleted ${docsDeleted} document records`);
      }
    } catch (error) {
      console.error('Error deleting documents:', error);
      deletionSummary.success = false;
    }

    // Step 3: Delete case records
    console.log(`Step 3: Deleting case records for user ${user.id}`);
    try {
      const { count: casesDeleted, error: casesDeleteError } = await adminClient
        .from('cases')
        .delete()
        .or(`agent_profile_id.eq.${user.id},client_profile_id.eq.${user.id}`);

      if (casesDeleteError) {
        console.error('Error deleting cases:', casesDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.cases = casesDeleted || 0;
        console.log(`Deleted ${casesDeleted} case records`);
      }
    } catch (error) {
      console.error('Error deleting cases:', error);
      deletionSummary.success = false;
    }

    // Step 4: Delete security logs
    console.log(`Step 4: Deleting security logs for user ${user.id}`);
    try {
      const { count: logsDeleted, error: logsDeleteError } = await adminClient
        .from('security_logs')
        .delete()
        .eq('user_id', user.id);

      if (logsDeleteError) {
        console.error('Error deleting security logs:', logsDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.security_logs = logsDeleted || 0;
        console.log(`Deleted ${logsDeleted} security log records`);
      }
    } catch (error) {
      console.error('Error deleting security logs:', error);
      deletionSummary.success = false;
    }

    // Step 5: Delete AI usage logs
    console.log(`Step 5: Deleting AI usage logs for user ${user.id}`);
    try {
      const { count: aiLogsDeleted, error: aiLogsDeleteError } = await adminClient
        .from('ai_usage_logs')
        .delete()
        .eq('user_id', user.id);

      if (aiLogsDeleteError) {
        console.error('Error deleting AI usage logs:', aiLogsDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.ai_usage_logs = aiLogsDeleted || 0;
        console.log(`Deleted ${aiLogsDeleted} AI usage log records`);
      }
    } catch (error) {
      console.error('Error deleting AI usage logs:', error);
      deletionSummary.success = false;
    }

    // Step 6: Delete profile record
    console.log(`Step 6: Deleting profile for user ${user.id}`);
    try {
      const { error: profileDeleteError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileDeleteError) {
        console.error('Error deleting profile:', profileDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.profile = true;
        console.log('Profile deleted');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      deletionSummary.success = false;
    }

    // Step 7: Delete auth user
    console.log(`Step 7: Deleting auth user ${user.id}`);
    try {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
        user.id
      );

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        deletionSummary.success = false;
      } else {
        deletionSummary.deleted_records.auth_user = true;
        console.log('Auth user deleted');
      }
    } catch (error) {
      console.error('Error deleting auth user:', error);
      deletionSummary.success = false;
    }

    if (deletionSummary.success) {
      console.log(
        `GDPR deletion completed successfully for user ${user.id}. Summary:`,
        deletionSummary
      );
    } else {
      console.warn(
        `GDPR deletion completed with errors for user ${user.id}. Summary:`,
        deletionSummary
      );
    }

    return new Response(JSON.stringify(deletionSummary, null, 2), {
      status: 200,
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('GDPR deletion error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
