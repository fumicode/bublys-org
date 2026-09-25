import { FC, useState } from "react";
import { Button, Stack, TextField } from "@mui/material";

type UserCreateFormViewProps = {
  onSubmit: (params: { name: string; birthday: string }) => void;
};

export const UserCreateFormView: FC<UserCreateFormViewProps> = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("1990-01-01");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, birthday });
      }}
    >
      <Stack spacing={2}>
        <TextField
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          size="small"
        />
        <TextField
          label="生年月日"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          required
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" type="submit">
          作成する
        </Button>
      </Stack>
    </form>
  );
};
