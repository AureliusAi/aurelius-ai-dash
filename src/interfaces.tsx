export type AlertDialogProps = {
  title: string;
  bodyText: string;
  okBtnText: string;
  closeBtnText: string;
  onSubmit?: () => void;
  close: () => void;
};
