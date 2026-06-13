export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppConfig {
  theme: "light" | "dark";
  language: string;
}
