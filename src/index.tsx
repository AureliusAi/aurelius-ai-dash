import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createTheme, styled, ThemeProvider } from "@mui/material/styles";
import "./index.css";
import DashboardWrapper from "./dashboard/DashboardWrapper";
import Dashboard from "./pages/dashboard";
import Data from "./pages/data";
import TrainOneShot from "./pages/train-one-shot";
import OnlineMode from "./pages/online-mode";
import Backtest from "./pages/backtest";
import reportWebVitals from "./reportWebVitals";

const rootElement = document.getElementById("root");

declare module "@mui/material/styles" {
  interface Theme {
    status: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}

const mdTheme = createTheme({
  palette: {
    primary: {
      main: "#35a660",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#F5BD1F",
      contrastText: "#6a0dad ",
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={mdTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="data" element={<Data />} />
            <Route path="train-one-shot" element={<TrainOneShot />} />
            <Route path="backtest" element={<Backtest />} />
            <Route path="online-mode" element={<OnlineMode />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
  rootElement
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
