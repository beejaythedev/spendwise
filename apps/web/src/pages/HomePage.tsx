import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, clearToken } from "../api";

type User = { id: string; email: string };

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>("/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        clearToken();
        navigate("/login");
      });
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  if (!user)
    return (
      <main>
        <p>Loading...</p>
      </main>
    );

  return (
    <main>
      <h1>Spendwise</h1>
      <p>
        Logged in as <strong>{user.email}</strong>
      </p>
      <button onClick={logout}>Log out</button>
    </main>
  );
}
