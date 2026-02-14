import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

interface PurgeResult {
  table_name: string;
  deleted_count: number;
}

interface StorageFile {
  name: string;
  created_at: string;
}

async function purgeExpiredData(): Promise<{
  success: boolean;
  message: string;
  results: PurgeResult[];
  storage_cleaned: number;
}> {
  const adminClient = createAdminClient();
  let storageCleanedCount = 0;

  try {
    // Call the PostgreSQL function to purge database records
    const { data: purgeResults, error: purgeError } = await adminClient.rpc(
      "purge_expired_data"
    );

    if (purgeError) {
      console.error("Database purge error:", purgeError);
      throw new Error(`Database purge failed: ${purgeError.message}`);
    }

    // Clean up temporary audit files from storage
    const { data: storageBucket, error: bucketError } =
      await adminClient.storage.from("temp-audit-files").list();

    if (bucketError && bucketError.message !== "Not found") {
      console.error("Storage list error:", bucketError);
    } else if (storageBucket && Array.isArray(storageBucket)) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const file of storageBucket) {
        if (file.name && file.created_at) {
          const fileCreatedAt = new Date(file.created_at);
          if (fileCreatedAt < sevenDaysAgo) {
            const { error: deleteError } = await adminClient.storage
              .from("temp-audit-files")
              .remove([file.name]);

            if (!deleteError) {
              storageCleanedCount++;
            } else {
              console.warn(
                `Failed to delete storage file ${file.name}:`,
                deleteError
              );
            }
          }
        }
      }
    }

    // Calculate total purged records
    const totalPurged = (purgeResults as PurgeResult[]).reduce(
      (sum, result) => sum + (result.deleted_count || 0),
      0
    );

    return {
      success: true,
      message: `Data purge completed successfully`,
      results: (purgeResults as PurgeResult[]) || [],
      storage_cleaned: storageCleanedCount,
    };
  } catch (error) {
    console.error("Purge failed:", error);
    throw error;
  }
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightIfNeeded(req);
  if (corsResponse) return corsResponse;

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed. Use POST to trigger purge.",
      }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }

  try {
    const result = await purgeExpiredData();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Request handler error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Data purge failed",
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
}

serve(handleRequest);
