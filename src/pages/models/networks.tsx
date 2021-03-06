import AddIcon from "@mui/icons-material/Add";
import LoadingButton from "@mui/lab/LoadingButton";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import TextField from "@mui/material/TextField";
import "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import React, { useEffect, useState } from "react";
import { API_CONFIG_ENDPOINT } from "../../endpoints";
import { H2Title } from "../../page-components/PageHeader";
import NetworkDetailsRenderer from "./networkDetailsRenderer";

function Networks() {
  const [modelData, setModelData] = useState(null);
  const [gridApi, setGridApi] = useState(null);

  const [instData, setInstData] = useState(null);
  const [nnDataRetError, setNNDataRetError] = useState(null);
  const [nnNDataRetLoading, setNNDataRetLoading] = useState<boolean>(false);

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

  const NetworkDataTableColDefs = [
    { headerName: "Instance Name", field: "instance_name", cellRenderer: "agGroupCellRenderer", cellStyle: { fontWeight: "bold" } },
    { headerName: "Version", field: "version", maxWidth: 95, editable: false },
    { headerName: "Creation Time", field: "creation_date" },
    { headerName: "Created By", field: "created_by" },
    { headerName: "Updated At", field: "updatedAt" },
  ];

  const onGridReady = (param: any) => {
    setGridApi(param.api);
  };

  const refreshNNFromDB = () => {
    setNNDataRetError(null);
    setNNDataRetLoading(true);
    fetch(`${API_CONFIG_ENDPOINT}/nn/get-all`)
      .then((res) => res.json())
      .then(
        (result) => {
          let json_body = JSON.parse(result.nn_instances);
          for (var i = 0; i < json_body.length; i++) {
            var obj = json_body[i];
            obj["nn_definition"] = obj["nn_definition"]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t")
              .replace(/(^"|"$)/g, "");
          }
          setInstData(json_body);
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setNNDataRetError(error);
        }
      )
      .catch((error) => {
        // handle the error
      })
      .finally(() => {
        setNNDataRetLoading(false);
      });
  };

  useEffect(() => {
    refreshNNFromDB();
  }, []);

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
          console.log(result);
          console.log("Saved new instance!!!! Refreshing all instances");
          if (result["is_error"]) {
            setSaveNewInstanceError(result["error_msg"]);
          } else {
            setCreateNewOpen(false);
            refreshNNFromDB();
          }
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

  const getRowNodeId = (data: any) => data.instance_name;

  return (
    <Box sx={{ p: 0, m: 0 }}>
      <Box display="flex" sx={{ justifyContent: "space-between", mb: 1 }}>
        <H2Title>Networks</H2Title>
        {nnNDataRetLoading ? (
          <span />
        ) : (
          <Button size="small" onClick={initiateCreateNewNN} variant="contained" startIcon={<AddIcon />}>
            Create New Neural Net
          </Button>
        )}
      </Box>

      {nnNDataRetLoading ? (
        <Box />
      ) : (
        <div className="ag-theme-balham" style={{ height: "calc(100vh - 250px)", width: "100%" }}>
          <AgGridReact
            rowData={instData}
            getRowNodeId={getRowNodeId}
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
            enableCellChangeFlash={true}
            detailCellRendererParams={{
              refreshStrategy: "everything",
            }}
            detailCellRenderer={"networkDetailsRenderer"}
            frameworkComponents={{ networkDetailsRenderer: NetworkDetailsRenderer }}
            onGridReady={onGridReady}
          ></AgGridReact>
        </div>
      )}

      <Dialog open={openCreateNew} onClose={handleCreateNewClose} maxWidth="md" fullWidth>
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
        {saveNewInstanceError && (
          <Box px={3} style={{ color: "#FF3333" }}>
            <strong>Save error:</strong> {saveNewInstanceError}
          </Box>
        )}
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
