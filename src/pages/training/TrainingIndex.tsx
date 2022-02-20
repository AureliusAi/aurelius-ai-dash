import * as React from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
//import Models from "./models";
import TrainOneShot from "./train-on-shot";
import PageHeader from "../../page-components/PageHeader";

export default function ModelsAndNetorksMain() {
  const [tabValue, setTabValue] = React.useState("train_one_shot");

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ mt: 0, width: "100%" }}>
       <Box>
      <PageHeader>Training</PageHeader>
      <TabContext value={tabValue}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <TabList onChange={handleChange} aria-label="training index page">
            <Tab label="Train One Shot" value="train_one_shot" />
            {/* <Tab label="Models" value="models" /> */}
          </TabList>
        </Box>
        <TabPanel sx={{ mt: 2, p: 0 }} value="train_one_shot">
          <TrainOneShot />
        </TabPanel>
        {/* <TabPanel sx={{ mt: 2, p: 0 }} value="models">
          <Models />
        </TabPanel> */}
      </TabContext>
    </Box>
    </Box>
  );
}
