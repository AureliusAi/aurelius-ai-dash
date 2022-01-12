import { NavLink } from "react-router-dom";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BoltIcon from "@mui/icons-material/Bolt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import StorageIcon from "@mui/icons-material/Storage";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import * as React from "react";

export const mainListItems = (
  <div>
    <NavLink className={({ isActive }) => (isActive ? "active-nav-link" : "inactive-nav-link")} to={`/`}>
      <ListItem button>
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
    </NavLink>

    <NavLink className={({ isActive }) => (isActive ? "active-nav-link" : "inactive-nav-link")} to={`/data`}>
      <ListItem button>
        <ListItemIcon>
          <StorageIcon />
        </ListItemIcon>
        <ListItemText primary="Data" />
      </ListItem>
    </NavLink>

    <NavLink className={({ isActive }) => (isActive ? "active-nav-link" : "inactive-nav-link")} to={`/train-one-shot`}>
      <ListItem button>
        <ListItemIcon>
          <DirectionsRunIcon />
        </ListItemIcon>
        <ListItemText primary="Train one shot" />
      </ListItem>
    </NavLink>

    <NavLink className={({ isActive }) => (isActive ? "active-nav-link" : "inactive-nav-link")} to={`/backtest`}>
      <ListItem button>
        <ListItemIcon>
          <BoltIcon />
        </ListItemIcon>
        <ListItemText primary="Backtest" />
      </ListItem>
    </NavLink>

    <NavLink className={({ isActive }) => (isActive ? "active-nav-link" : "inactive-nav-link")} to={`/online-mode`}>
      <ListItem button>
        <ListItemIcon>
          <OnlinePredictionIcon />
        </ListItemIcon>
        <ListItemText primary="Oneline mode" />
      </ListItem>
    </NavLink>
  </div>
);

export const secondaryListItems = (
  <div>
    <ListSubheader inset>Performance reports</ListSubheader>
    <ListItem button>
      <ListItemIcon>
        <AssignmentIcon />
      </ListItemIcon>
      <ListItemText primary="Today" />
    </ListItem>
    <ListItem button>
      <ListItemIcon>
        <AssignmentIcon />
      </ListItemIcon>
      <ListItemText primary="Current month" />
    </ListItem>
    <ListItem button>
      <ListItemIcon>
        <AssignmentIcon />
      </ListItemIcon>
      <ListItemText primary="YTD" />
    </ListItem>
  </div>
);
