import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Dashboard from "./dashboard/Dashboard";
import Data from "./pages/data";
import TrainOneShot from "./pages/train-one-shot";
import OnlineMode from "./pages/online-mode";
import Backtest from "./pages/backtest";
import reportWebVitals from "./reportWebVitals";

const rootElement = document.getElementById("root");

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />}>
          <Route path="data" element={<Data />} />
          <Route path="train-one-shot" element={<TrainOneShot />} />
          <Route path="backtest" element={<Backtest />} />
          <Route path="online-mode" element={<OnlineMode />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  rootElement
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
