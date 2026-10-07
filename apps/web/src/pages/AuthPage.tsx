import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, setToken } from "../api";

type Props = { mode: "login" | "register" };

export default function AuthPage({ mode }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!isLogin) {
        await api("/auth/register", {
          method: "POST",
          body: { email, password },
        });
      }
      const { token } = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>{isLogin ? "Log in" : "Create an account"}</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
        </button>
      </form>

      <p>
        {isLogin ? (
          <>
            No account? <Link to="/register">Sign up</Link>
          </>
        ) : (
          <>
            Already have an account? <Link to="/login">Log in</Link>
          </>
        )}
      </p>
    </main>
  );
}
