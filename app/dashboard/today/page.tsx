"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Task = {
  id: string;
  title: string;
  related_id: string;
  due_at: string;
  status: string;
};

const supabase = createClientComponentClient();

function getTodayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export default function TodayDashboardPage() {
  const queryClient = useQueryClient();
  const { start, end } = getTodayRange();

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, related_id, due_at, status")
        .gte("due_at", start)
        .lte("due_at", end)
        .order("due_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", "today"] }),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (isError) return <div className="p-4 text-red-500">Error loading tasks</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Tasks Due Today</h1>

      {!tasks?.length ? (
        <p>No tasks due today 🎉</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Application ID</th>
              <th className="p-2 text-left">Due Date</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{t.title}</td>
                <td className="p-2">{t.related_id}</td>
                <td className="p-2">{new Date(t.due_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{t.status}</td>
                <td className="p-2">
                  <button
                    disabled={t.status === "completed"}
                    onClick={() => markComplete.mutate(t.id)}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    {t.status === "completed" ? "Completed" : "Mark Complete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
                  }
