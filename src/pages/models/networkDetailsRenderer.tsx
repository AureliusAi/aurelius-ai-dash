import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import React, { useState } from "react";
import AlertDialog, { alertDialog } from "../../page-components/AlertDialog";
import { API_CONFIG_ENDPOINT } from "../../endpoints";
import LoadingButton from "@mui/lab/LoadingButton";

const NetworkDetailsRenderer = (data: any) => {
  // console.log(data);
  // console.log(data.data);
  // console.log(data.api);
  // console.log(data.data.instance_name);

  const [api, setApi] = useState<any>(data.api);

  const [instanceName, setInstanceName] = useState<string>(data.data.instance_name);
  const [instanceVersion, setInstanceVersion] = useState<string>(data.data.version);
  const [nnDefinition, setNnDefinition] = useState<string>(data.data.nn_definition);

  const [nnInstanceProcessingError, setNNInstanceProcessingError] = useState<string | null>(null);
  const [nnInstanceProcessingRunning, setNNInstanceProcessingRunning] = useState<boolean>(false);

  const [updatedName, setUpdatedName] = useState<string>(data.instance_name);

  const updateNnDefinition = (e: any) => {
    setNnDefinition(e.target.value);
  };

  const handleUpdateNN = () => {
    console.log(`Ok Updating!!!!: ${instanceName}`);

    const updateInstanceOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instance_to_update: instanceName, instance_definition_to_update: nnDefinition }),
    };
    setNNInstanceProcessingError(null);
    setNNInstanceProcessingRunning(true);
    fetch(`${API_CONFIG_ENDPOINT}/nn/update-instance`, updateInstanceOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log(result);
          if (result["is_error"]) {
            setNNInstanceProcessingError(result["error_msg"]);
            return false;
          } else {
            const myTransaction = {
              update: [
                // updating a row, the grid will look for the row with ID = 2 to update
                {
                  instance_name: instanceName,
                  version: result["Version"],
                  nn_definition: nnDefinition,
                  creation_date: result["CreateDate"],
                  created_by: result["CreateUser"],
                  updatedAt: result["UpdateDate"],
                },
              ],
            };
            api.applyTransaction(myTransaction);
            return true;
          }
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setNNInstanceProcessingError(error);
        }
      )
      .finally(() => {
        setNNInstanceProcessingRunning(false);
      });
  };

  const handleDeleteNN = () => {
    console.log(`Ok deleting!!!!: ${instanceName}`);

    const deleteInstanceOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instance_to_delete: instanceName, instance_version_to_delete: instanceVersion }),
    };
    setNNInstanceProcessingError(null);
    setNNInstanceProcessingRunning(true);
    fetch(`${API_CONFIG_ENDPOINT}/nn/delete-instance`, deleteInstanceOptions)
      .then((res) => res.json())
      .then(
        (result) => {
          console.log(result);
          if (result["is_error"]) {
            setNNInstanceProcessingError(result["error_msg"]);
            return false;
          } else {
            const myTransaction = {
              remove: [{ instance_name: instanceName }],
            };
            api.applyTransaction(myTransaction);
            return true;
          }
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          setNNInstanceProcessingError(error);
        }
      )
      .finally(() => {
        setNNInstanceProcessingRunning(false);
      });
  };

  function onDeleteNnDefinition(event: React.MouseEvent) {
    console.log(`Deleting : ${instanceName} definition`);
    alertDialog(
      `Woah! Hold on there son. Are you sure you want to delete "${instanceName}"?`,
      `Are you sure you want to delete this Network? (It will become archived in the DB)`,
      "Yes please",
      "No thanks. Don't delete",
      handleDeleteNN
    );
  }

  function onUpdateNnDefinition(event: React.MouseEvent) {
    console.log(`Updating : ${instanceName} definition`);
    alertDialog(
      `Just Checking Chief. Are you sure you want to Update definition of "${instanceName}"?`,
      `Are you sure you want to update this Network? (The Version will be updated)`,
      "Yes please",
      "No thanks. Don't update",
      handleUpdateNN
    );
  }

  return (
    <div style={{ padding: 10, backgroundColor: "#EEEEEE" }}>
      <Box pl={3} pb={1}>
        <Box style={{ padding: 5 }}>Neural network definition:</Box>
        <Box style={{ width: "100%" }}>
          <TextareaAutosize style={{ width: "100%" }} value={nnDefinition} onChange={updateNnDefinition} />
        </Box>
        <Box display="flex" sx={{ justifyContent: "space-between" }}>
          <Box display="flex">
            <LoadingButton loading={nnInstanceProcessingRunning} sx={{ mt: 1, pr: 2 }} onClick={onUpdateNnDefinition} variant="contained">
              Update Definition
            </LoadingButton>
            <Box style={{ color: "#AAAAAA" }} p={1} pt={2}>
              Updating a NN will update it's version
            </Box>
          </Box>
          <Box style={{ color: "#FF3333" }}>{nnInstanceProcessingError && { nnInstanceProcessingError }}</Box>
          <LoadingButton loading={nnInstanceProcessingRunning} sx={{ mt: 1 }} color="error" onClick={onDeleteNnDefinition} variant="contained">
            Delete Definition
          </LoadingButton>
        </Box>
      </Box>
      <AlertDialog />
    </div>
  );
};

export default NetworkDetailsRenderer;
