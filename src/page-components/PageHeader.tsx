import * as React from "react";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
  children?: React.ReactNode;
}

export default function Title(props: PageHeaderProps) {
  return (
    <Typography component="h2" variant="h4" color="primary" gutterBottom>
      {props.children}
    </Typography>
  );
}
