import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext<{
  theme: "light" | "dark";
  toggleTheme: () => void;
  notTheme: () => "light" | "dark";
}>({
  theme: "light",
  toggleTheme: () => {},
  notTheme: () => "dark",
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialTheme = (): "light" | "dark" => {
    const storedTheme = localStorage.getItem("theme");
    return storedTheme === "dark" ? "dark" : "light";
  };

  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const notTheme = () => (theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, notTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};