// supabase/functions/create-task/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CreateTaskPayload = {
  application_id?: string;
  task_type?: string;
  due_at?: string;
};

const VALID_TYPES = ["call", "email", "review"] as const;

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST allowed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let body: CreateTaskPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { application_id, task_type, due_at } = body;

    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!VALID_TYPES.includes(task_type as any)) {
      return new Response(
        JSON.stringify({ error: "Invalid task type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const dueDate = new Date(due_at);
    if (Number.isNaN(dueDate.getTime()) || dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future datetime" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        related_id: application_id,
        type: task_type,
        due_at,
        title: `Follow up - ${task_type}`,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Database insert failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Realtime event emit
    supabase.channel("tasks-events").send({
      type: "broadcast",
      event: "task.created",
      payload: {
        task_id: data.id,
        application_id,
        task_type,
        due_at,
      },
    });

    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
