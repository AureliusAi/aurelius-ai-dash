import { createTheme, ThemeProvider } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DashboardWrapper from "./dashboard/DashboardWrapper";
import "./index.css";
import Backtest from "./pages/backtest/BacktestIndex";
import Models from "./pages/models/ModelsIndex";
import Dashboard from "./pages/dashboard/DashboardIndex";
import Data from "./pages/data/DataIndex";
import OnlineMode from "./pages/online-mode";
import TrainOneShot from "./pages/training/TrainingIndex";
import reportWebVitals from "./reportWebVitals";
import Networks from "./pages/models/networks";

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
  typography: {
    fontSize: 12,
  },
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
  components: {
    MuiButton: {
      defaultProps: {
        size: "small",
        disableFocusRipple: true,
        disableRipple: true,
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        sx: { py: 0, px: 0 },
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: "small",
        sx: { py: 0, px: 0 },
      },
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
            <Route path="models" element={<Models />} />
            <Route path="networks" element={<Models />} />
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
