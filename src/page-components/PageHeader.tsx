import * as React from "react";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
  children?: React.ReactNode;
}

interface H2HeaderProps {
  children?: React.ReactNode;
}

export default function Title(props: PageHeaderProps) {
  return (
    <Typography component="h1" variant="h4" color="primary" gutterBottom>
      {props.children}
    </Typography>
  );
}

function H2Title(props: H2HeaderProps) {
  return (
    <Typography component="h2" variant="h5" color="secondar" gutterBottom>
      {props.children}
    </Typography>
  );
}

export { H2Title };
