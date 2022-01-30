import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import React, { useState } from "react";
import AlertDialog, { alertDialog } from "../../page-components/AlertDialog";

const NetworkDetailsRenderer = (data: any) => {
  console.log(data.data);
  const [instanceName, setInstanceName] = useState<string>(data.data.instance_name);
  const [nnDefinition, setNnDefinition] = useState<string>(data.data.nn_definition);

  const updateNnDefinition = (e: any) => {
    setNnDefinition(e.target.value);
  };

  function onUpdateNnDefinition(event: React.MouseEvent) {
    console.log(`Updating : ${instanceName} definition`);
  }

  const handleDeleteNN = () => {
    console.log(`Ok deleting!!!!: ${instanceName}`);
  };

  function onDeleteNnDefinition(event: React.MouseEvent) {
    console.log(`Deleting : ${instanceName} definition`);
    alertDialog(
      "Are you sure you want to delete this Network?",
      "Are you sure you want to delete this Network? (It will become archived in the DB)",
      "Yes please",
      "No thanks. Don't delete",
      handleDeleteNN
    );
  }

  return (
    <div style={{ padding: 10, backgroundColor: "#FFFEEE" }}>
      <Box>
        <Box style={{ padding: 5 }}>Neural network definition:</Box>
        <Box style={{ width: "100%" }}>
          <TextareaAutosize style={{ width: "100%" }} value={nnDefinition} onChange={updateNnDefinition} />
        </Box>
        <Box display="flex" sx={{ justifyContent: "space-between" }}>
          <Button sx={{ mt: 1 }} onClick={onUpdateNnDefinition} variant="contained">
            Update Definition
          </Button>
          <Button sx={{ mt: 1 }} color="error" onClick={onDeleteNnDefinition} variant="contained">
            Delete Definition
          </Button>
        </Box>
      </Box>
      <AlertDialog />
    </div>
  );
};

export default NetworkDetailsRenderer;
