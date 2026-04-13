"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [done, setDone] = useState(false);
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("purleads_token");

  useEffect(() => {
    api.invites.get(token)
      .then((inv: any) => setInvite(inv))
      .catch((err: any) => setError(err.message));
  }, [token]);

  async function accept() {
    setAccepting(true);
    try {
      const result = await api.invites.accept(token) as any;
      // Switch to the new workspace
      localStorage.setItem("purleads_wid", result.workspaceId);
      setDone(true);
      setTimeout(() => router.replace("/app"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="card p-8 w-full max-w-md text-center">
          <p className="text-red-600 font-medium mb-2">Invite error</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button onClick={() => router.replace("/auth/login")} className="btn-primary mt-4">Go to login</button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading invite...</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 w-full max-w-md text-center">
          <p className="text-green-600 font-semibold text-lg mb-1">You&apos;re in!</p>
          <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card p-8 w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-1">You&apos;ve been invited</h1>
        <p className="text-gray-500 text-sm mb-6">
          Join <span className="font-semibold text-gray-900">{invite.workspace?.name}</span> as <span className="font-medium">{invite.role}</span>
        </p>
        {isLoggedIn ? (
          <button onClick={accept} disabled={accepting} className="btn-primary w-full">
            {accepting ? "Joining..." : "Accept Invite"}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">You need to be logged in to accept this invite.</p>
            <button
              onClick={() => router.push(`/auth/login?next=/invite/${token}`)}
              className="btn-primary w-full"
            >
              Log in to accept
            </button>
            <button
              onClick={() => router.push(`/auth/register?next=/invite/${token}`)}
              className="btn-secondary w-full"
            >
              Create account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
