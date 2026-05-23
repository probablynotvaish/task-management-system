import { api } from "./client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export async function fetchCurrentUser() {
  const { data } = await api.get<CurrentUser>("/api/me");
  return data;
}