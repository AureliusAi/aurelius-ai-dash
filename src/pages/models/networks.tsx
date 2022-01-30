import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import PageHeader, { H2Title } from "../../page-components/PageHeader";
import AddIcon from "@mui/icons-material/Add";
import { AgGridReact, AgGridColumn } from "ag-grid-react";
import "ag-grid-enterprise";
import NetworkDetailsRenderer from "./networkDetailsRenderer";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { API_CONFIG_ENDPOINT } from "../../endpoints";
import LoadingButton from "@mui/lab/LoadingButton";

function Networks() {
  const [modelData, setModelData] = useState(null);
  const [gridApi, setGridApi] = useState(null);

  const [newInstanceName, setNewInstanceName] = useState<string>("");
  const [newInstanceDef, setNewInstanceDef] = useState<string>("");
  const [isCreatingNewInstance, setCreatingNewInstance] = useState<boolean>(false);
  const [saveNewInstanceError, setSaveNewInstanceError] = useState<string | null>(null);

  const [openCreateNew, setCreateNewOpen] = useState<boolean>(false);
  const handleCreateNewClickOpen = () => {
    setCreateNewOpen(true);
  };
  const handleCreateNewClose = () => {
    setCreateNewOpen(false);
  };

  const rowData = [
    {
      instance_name: "Default CNN",
      version: 2.0,
      nn_definition: `[
      {"filter_shape": [1, 2], "filter_number": 3, "type": "ConvLayer"},
      {"filter_number":10, "type": "EIIE_Dense", "regularizer": "L2", "weight_decay": 5e-9},
      {"type": "EIIE_Output_WithW","regularizer": "L2", "weight_decay": 5e-8}
]`,
      creation_date: "2022-01-29 12:00:00",
      created_by: "system",
      updatedAt: "2022-01-29 23:34:00",
    },
    {
      instance_name: "Resnet 1.0",
      version: 1.0,
      nn_definition: `[
      {"filter_shape": [1, 2], "filter_number": 3, "type": "ConvLayer"},
      {"filter_number":10, "type": "EIIE_Dense", "regularizer": "L2", "weight_decay": 5e-9},
      {"type": "EIIE_Output_WithW","regularizer": "L2", "weight_decay": 5e-8}
]`,
      creation_date: "2022-01-30 12:00:00",
      created_by: "system",
      updatedAt: "2022-01-30 23:34:00",
    },
  ];

  const NetworkDataTableColDefs = [
    { headerName: "Instance Name", field: "instance_name", cellRenderer: "agGroupCellRenderer", cellStyle: { "font-weight": "bold" } },
    { headerName: "Version", field: "version", maxWidth: 95, editable: false },
    { headerName: "Creation Time", field: "creation_date" },
    { headerName: "Created By", field: "created_by" },
    { headerName: "Updated At", field: "updatedAt" },
  ];

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  const onCreateNewNN = (event: React.MouseEvent) => {
    // get the name and contents
    // 1. First check the name is not already taken and display error if is
    // 2. Save into the DB with version 1
    // 3. Refresh NN table from the DB
    console.log("Creating new Instance with name: " + newInstanceName);
    console.log("Creating new Instance with definition: " + newInstanceDef);

    const createNewInstanceOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inst_name: newInstanceName, inst_definition: newInstanceDef, user: "system" }),
    };
    setSaveNewInstanceError(null);
    setCreatingNewInstance(true);
    fetch(`${API_CONFIG_ENDPOINT}/nn/save-new-instance`, createNewInstanceOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log("Saved new instance!!!! Refreshing all instances");
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setSaveNewInstanceError(error);
        }
      )
      .finally(() => {
        setCreatingNewInstance(false);
      });
  };

  const initiateCreateNewNN = (event: React.MouseEvent) => {
    console.log("Creating new Neural Network");
    setCreateNewOpen(true);
  };

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <Box display="flex" sx={{ justifyContent: "space-between", mb: 1 }}>
        <H2Title>Networks</H2Title>
        <Button size="small" onClick={initiateCreateNewNN} variant="contained" startIcon={<AddIcon />}>
          Create New Neural Net
        </Button>
      </Box>
      <div className="ag-theme-balham" style={{ height: "calc(100vh - 250px)", width: "100%" }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={NetworkDataTableColDefs}
          defaultColDef={{
            sortable: true,
            editable: true,
            filter: true,
            flex: 1,
            floatingFilter: true,
          }}
          detailRowAutoHeight={true}
          masterDetail={true}
          detailCellRenderer={"networkDetailsRenderer"}
          frameworkComponents={{ networkDetailsRenderer: NetworkDetailsRenderer }}
          onGridReady={onGridReady}
        ></AgGridReact>
      </div>

      <Dialog open={openCreateNew} onClose={handleCreateNewClose} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Neural Network</DialogTitle>
        <DialogContent>
          <DialogContentText>Enter the details of the new Neural Network</DialogContentText>
          <TextField
            onChange={(event) => setNewInstanceName(event.target.value)}
            autoFocus
            margin="dense"
            multiline
            id="name"
            label="Instance Name"
            style={{ marginBottom: "10px" }}
            type="email"
            fullWidth
            variant="outlined"
          />
          <Box sx={{ color: "#666" }}>Neural Network Definition</Box>
          <TextareaAutosize
            onChange={(event) => {
              setNewInstanceDef(event.target.value);
            }}
            aria-label="minimum height"
            minRows={5}
            placeholder=""
            defaultValue="[{}]"
            style={{ width: "100%" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateNewClose}>Cancel</Button>
          <LoadingButton loading={isCreatingNewInstance} variant="contained" onClick={onCreateNewNN}>
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Networks;
