import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import Models from "./models";
import Networks from "./networks";

export default function ModelsAndNetorksMain() {
  const [tabValue, setTabValue] = React.useState("models");

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ mt: 0, width: "100%" }}>
      <TabContext value={tabValue}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleChange} aria-label="lab API tabs example">
            <Tab label="Models" value="models" />
            <Tab label="Networks" value="networks" />
          </TabList>
        </Box>
        <TabPanel sx={{ mt: 2, p: 0 }} value="models">
          <Models />
        </TabPanel>
        <TabPanel sx={{ mt: 2, p: 0 }} value="networks">
          <Networks />
        </TabPanel>
      </TabContext>
    </Box>
  );
}
