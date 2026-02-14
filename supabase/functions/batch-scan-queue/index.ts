import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { createAdminClient, authenticateUser } from "../_shared/supabase.ts";

interface BatchJobItem {
  id: string;
  batch_id: string;
  file_path: string;
  status: "pending" | "processing" | "completed" | "failed";
  risk_score?: number;
  result?: Record<string, unknown>;
  error?: string;
  created_at?: string;
  updated_at?: string;
}

interface BatchJob {
  id: string;
  user_id: string;
  status: "pending" | "processing" | "completed";
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
}

interface BatchProgress {
  batch_id: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  status: string;
}

async function enqueueBatch(
  adminClient: any,
  userId: string,
  filePaths: string[]
): Promise<BatchJob> {
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Create batch job record
  const { data: batchData, error: batchError } = await adminClient
    .from("batch_scan_jobs")
    .upsert(
      {
        id: batchId,
        user_id: userId,
        status: "pending",
        total_items: filePaths.length,
        completed_items: 0,
        failed_items: 0,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (batchError) {
    throw new Error(`Failed to create batch job: ${batchError.message}`);
  }

  // Create individual job items
  const jobItems = filePaths.map((filePath) => ({
    id: crypto.randomUUID(),
    batch_id: batchId,
    file_path: filePath,
    status: "pending",
    created_at: now,
    updated_at: now,
  }));

  const { error: itemsError } = await adminClient
    .from("batch_scan_items")
    .upsert(jobItems, { onConflict: "id" });

  if (itemsError) {
    throw new Error(`Failed to create batch items: ${itemsError.message}`);
  }

  return batchData as BatchJob;
}

async function getBatchStatus(
  adminClient: any,
  batchId: string
): Promise<BatchProgress> {
  // Get batch job
  const { data: batch, error: batchError } = await adminClient
    .from("batch_scan_jobs")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError) {
    throw new Error(`Failed to fetch batch job: ${batchError.message}`);
  }

  // Get item counts by status
  const { data: items, error: itemsError } = await adminClient
    .from("batch_scan_items")
    .select("status")
    .eq("batch_id", batchId);

  if (itemsError) {
    throw new Error(`Failed to fetch batch items: ${itemsError.message}`);
  }

  const statusCounts = {
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
  };

  items.forEach(
    (item: { status: keyof typeof statusCounts }) => {
      statusCounts[item.status]++;
    }
  );

  return {
    batch_id: batchId,
    total: batch.total_items,
    completed: statusCounts.completed,
    failed: statusCounts.failed,
    pending: statusCounts.pending,
    status: batch.status,
  };
}

async function getBatchResults(
  adminClient: any,
  batchId: string
): Promise<BatchJobItem[]> {
  const { data: items, error } = await adminClient
    .from("batch_scan_items")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "completed");

  if (error) {
    throw new Error(`Failed to fetch results: ${error.message}`);
  }

  return items as BatchJobItem[];
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (handleCorsPreflightIfNeeded(req)) {
    return new Response("ok", { headers: getCorsHeaders() });
  }

  // Only allow POST and GET requests
  if (!["POST", "GET"].includes(req.method)) {
    return new Response(
      JSON.stringify({
        error: "Method not allowed. Use POST or GET.",
      }),
      {
        status: 405,
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Authenticate user
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createAdminClient();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const batchId = url.searchParams.get("batch_id");

    switch (action) {
      case "enqueue": {
        if (req.method !== "POST") {
          throw new Error("Enqueue requires POST method");
        }

        const body = await req.json();
        const filePaths: string[] = body.file_paths;

        if (!Array.isArray(filePaths) || filePaths.length === 0) {
          return new Response(
            JSON.stringify({
              error: "Invalid request. Provide file_paths array.",
            }),
            {
              status: 400,
              headers: {
                ...getCorsHeaders(),
                "Content-Type": "application/json",
              },
            }
          );
        }

        const batch = await enqueueBatch(
          adminClient,
          authUser.id,
          filePaths
        );

        return new Response(JSON.stringify(batch), {
          status: 201,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
        });
      }

      case "status": {
        if (!batchId) {
          return new Response(
            JSON.stringify({ error: "batch_id parameter is required" }),
            {
              status: 400,
              headers: {
                ...getCorsHeaders(),
                "Content-Type": "application/json",
              },
            }
          );
        }

        const progress = await getBatchStatus(adminClient, batchId);

        return new Response(JSON.stringify(progress), {
          status: 200,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
        });
      }

      case "results": {
        if (!batchId) {
          return new Response(
            JSON.stringify({ error: "batch_id parameter is required" }),
            {
              status: 400,
              headers: {
                ...getCorsHeaders(),
                "Content-Type": "application/json",
              },
            }
          );
        }

        const results = await getBatchResults(adminClient, batchId);

        return new Response(JSON.stringify({ batch_id: batchId, results }), {
          status: 200,
          headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action. Use "enqueue", "status", or "results".',
          }),
          {
            status: 400,
            headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Request handler error:", error);

    return new Response(
      JSON.stringify({
        error: "Request processing failed",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(), "Content-Type": "application/json" },
      }
    );
  }
}

serve(handleRequest);
