import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useAlertDialogStore } from "./custom_hooks";
import Box from "@mui/material/Box";
import { IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";

const AlertDialog: React.FC = () => {
  const { title, bodyText, okBtnText, closeBtnText, onSubmit, close } = useAlertDialogStore();

  return (
    <Dialog open={Boolean(onSubmit)} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton>
          <Close onClick={close} />
        </IconButton>
      </Box>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{bodyText}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={close} sx={{ pr: 2 }} autoFocus>
          {closeBtnText}
        </Button>
        <Button
          onClick={() => {
            if (onSubmit) {
              onSubmit();
            }
            close();
          }}
          color="error"
        >
          {okBtnText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;

export const alertDialog = (title: string, bodyText: string, okBtnText: string, closeBtnText: string, onSubmit: () => void) => {
  useAlertDialogStore.setState({
    title,
    bodyText,
    okBtnText,
    closeBtnText,
    onSubmit,
  });
};
