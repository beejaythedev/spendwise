import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { getToken } from "../api";

export default function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}
