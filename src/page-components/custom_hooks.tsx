import create from "zustand";
import { AlertDialogProps } from "../interfaces";

const useAlertDialogStore = create<AlertDialogProps>((set) => ({
  title: "",
  bodyText: "",
  okBtnText: "",
  closeBtnText: "",
  onSubmit: undefined,
  close: () =>
    set({
      onSubmit: undefined,
    }),
}));

export { useAlertDialogStore };
